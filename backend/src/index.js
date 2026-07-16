import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Multer setup
const upload = multer({ dest: join(__dirname, '../uploads') });

// Validation helpers
const validateEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => typeof password === 'string' && password.length >= 6;
const validateName = (name) => typeof name === 'string' && name.trim().length > 0;

const normalizeSizes = (value) => {
  let values = [];

  if (Array.isArray(value)) {
    values = value;
  } else if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      values = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      values = value.split(',');
    }
  }

  return [...new Set(values.map((item) => String(item).trim()).filter(Boolean))];
};

const parseBoolean = (value) => value === true || value === 'true';
const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const httpError = (status, message) => Object.assign(new Error(message), { status });

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Auth middleware
const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Routes
app.get('/', (req, res) => res.json({ message: 'Wilmas Fashion API', status: 'running', timestamp: new Date().toISOString() }));
app.get('/api/ping', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Auth
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcryptjs.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ 
    token, 
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    expiresIn: 604800
  });
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!validateName(name)) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!validatePassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  
  const hash = await bcryptjs.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hash } });
  
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ 
    token, 
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    expiresIn: 604800
  });
}));

// Products
app.get('/api/products', asyncHandler(async (req, res) => {
  const { category, size, minPrice, maxPrice, onOffer, search, page = 1, limit = 12 } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 12));
  const skip = (pageNum - 1) * limitNum;
  
  const where = {};
  if (category && category.trim()) where.category = category.trim();
  if (size && size.trim()) where.sizes = { contains: JSON.stringify(size.trim()) };
  
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  
  if (onOffer === 'true') where.onOffer = true;
  
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm } },
      { sku: { contains: searchTerm } },
      { color: { contains: searchTerm } }
    ];
  }
  
  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where })
  ]);
  
  res.json({
    items: products,
    total,
    page: pageNum,
    limit: limitNum,
    pages: Math.ceil(total / limitNum)
  });
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
  
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  res.json(product);
}));

app.post('/api/products', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { name, sku, brand, category, sizes, size, color, price, discount, onOffer, stock, image } = req.body;
  const normalizedSizes = normalizeSizes(sizes !== undefined ? sizes : size);
  const parsedPrice = Number(price);
  const parsedStock = Number(stock);
  const parsedDiscount = discount === undefined ? 0 : Number(discount);
  
  if (!validateName(name)) return res.status(400).json({ error: 'Name is required' });
  if (!validateName(sku)) return res.status(400).json({ error: 'SKU is required' });
  if (!validateName(brand)) return res.status(400).json({ error: 'Brand is required' });
  if (!validateName(category)) return res.status(400).json({ error: 'Category is required' });
  if (!normalizedSizes.length) return res.status(400).json({ error: 'At least one size is required' });
  if (!validateName(color)) return res.status(400).json({ error: 'Color is required' });
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  if (stock === null || stock === '' || !Number.isInteger(parsedStock) || parsedStock < 0) {
    return res.status(400).json({ error: 'Valid stock is required' });
  }
  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
    return res.status(400).json({ error: 'Discount must be between 0 and 100' });
  }
  
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      sku: sku.trim(),
      brand: brand.trim(),
      category: category.trim(),
      sizes: JSON.stringify(normalizedSizes),
      color: color.trim(),
      price: parsedPrice,
      discount: parsedDiscount,
      onOffer: parseBoolean(onOffer),
      stock: parsedStock,
      image: typeof image === 'string' && image.trim() ? image.trim() : (req.file?.filename || null)
    }
  });
  
  res.status(201).json(product);
}));

app.put('/api/products/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
  
  const { name, sku, brand, category, sizes, size, color, price, discount, onOffer, stock, image } = req.body;
  
  if (name !== undefined && !validateName(name)) return res.status(400).json({ error: 'Name cannot be empty' });
  if (sku !== undefined && !validateName(sku)) return res.status(400).json({ error: 'SKU cannot be empty' });
  if (brand !== undefined && !validateName(brand)) return res.status(400).json({ error: 'Brand cannot be empty' });
  if (category !== undefined && !validateName(category)) return res.status(400).json({ error: 'Category cannot be empty' });
  if (color !== undefined && !validateName(color)) return res.status(400).json({ error: 'Color cannot be empty' });
  if (price !== undefined && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  if (stock !== undefined && (stock === null || stock === '' || !Number.isInteger(Number(stock)) || Number(stock) < 0)) {
    return res.status(400).json({ error: 'Valid stock is required' });
  }
  if (discount !== undefined && (!Number.isFinite(Number(discount)) || Number(discount) < 0 || Number(discount) > 100)) {
    return res.status(400).json({ error: 'Discount must be between 0 and 100' });
  }
  
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (sku !== undefined) data.sku = sku.trim();
  if (brand !== undefined) data.brand = brand.trim();
  if (category !== undefined) data.category = category.trim();
  if (sizes !== undefined || size !== undefined) {
    const normalizedSizes = normalizeSizes(sizes !== undefined ? sizes : size);
    if (!normalizedSizes.length) return res.status(400).json({ error: 'At least one size is required' });
    data.sizes = JSON.stringify(normalizedSizes);
  }
  if (color !== undefined) data.color = color.trim();
  if (price !== undefined) data.price = Number(price);
  if (discount !== undefined) data.discount = Number(discount);
  if (onOffer !== undefined) data.onOffer = parseBoolean(onOffer);
  if (stock !== undefined) data.stock = Number(stock);
  if (image !== undefined) data.image = typeof image === 'string' && image.trim() ? image.trim() : null;
  if (req.file) data.image = req.file.filename;
  
  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
}));

app.delete('/api/products/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
  
  await prisma.product.delete({ where: { id } });
  res.json({ success: true, message: 'Product deleted' });
}));

// Sales
app.post('/api/sales', requireAuth, asyncHandler(async (req, res) => {
  const productId = Number(req.body.productId);
  const quantity = Number(req.body.quantity);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Valid product ID is required' });
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw httpError(404, 'Product not found');

    const stockUpdate = await tx.product.updateMany({
      where: { id: productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } }
    });
    if (stockUpdate.count !== 1) throw httpError(409, 'Insufficient stock');

    const discount = product.onOffer
      ? Math.min(100, Math.max(0, Number(product.discount) || 0))
      : 0;
    const unitPrice = roundMoney(product.price * (1 - discount / 100));
    const total = roundMoney(unitPrice * quantity);
    const sale = await tx.sale.create({
      data: { userId: req.user.id, productId, quantity, total }
    });

    return {
      sale,
      product: { id: product.id, name: product.name, sku: product.sku },
      unitPrice,
      discount,
      remainingStock: product.stock - quantity
    };
  });

  res.json({
    ...result.sale,
    product: result.product,
    unitPrice: result.unitPrice,
    discount: result.discount,
    remainingStock: result.remainingStock
  });
}));

app.get('/api/sales', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ include: { product: true, user: { select: { id: true, name: true, email: true } } } });
    res.json(sales);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: { role }, select: { id: true, name: true, email: true, role: true } });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ filename: req.file.filename, url: `/uploads/${req.file.filename}` });
});

// Analytics
app.get('/api/stats/overview', async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();
    const onOfferCount = await prisma.product.count({ where: { onOffer: true } });
    const lowStockCount = await prisma.product.count({ where: { stock: { lt: 10 } } });
    
    res.json({
      totalProducts,
      onOfferCount,
      lowStockCount
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/analytics/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const totalSales = await prisma.sale.count();
    const totalRevenue = (await prisma.sale.aggregate({ _sum: { total: true } }))._sum.total || 0;
    const totalUsers = await prisma.user.count();
    const totalProducts = await prisma.product.count();
    
    const topProducts = await prisma.product.findMany({
      include: { sales: true },
      take: 5,
      orderBy: { sales: { _count: 'desc' } }
    });
    
    const recentSales = await prisma.sale.findMany({
      include: { product: true, user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    res.json({
      totalSales,
      totalRevenue,
      totalUsers,
      totalProducts,
      topProducts: topProducts.map(p => ({ id: p.id, name: p.name, salesCount: p.sales.length })),
      recentSales
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Global error handler (must be registered after all routes)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : err.message });
});

// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
