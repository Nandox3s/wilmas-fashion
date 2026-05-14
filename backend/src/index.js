import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Multer setup
const upload = multer({ dest: join(__dirname, '../uploads') });

// Validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 6;
const validateName = (name) => name && name.trim().length > 0;

// Error handler wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

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
  if (size && size.trim()) where.size = size.trim();
  
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }
  
  if (onOffer === 'true') where.onOffer = true;
  
  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { sku: { contains: searchTerm, mode: 'insensitive' } },
      { color: { contains: searchTerm, mode: 'insensitive' } }
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
  const { name, sku, category, size, color, price, stock } = req.body;
  
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!sku?.trim()) return res.status(400).json({ error: 'SKU is required' });
  if (!category?.trim()) return res.status(400).json({ error: 'Category is required' });
  if (!size?.trim()) return res.status(400).json({ error: 'Size is required' });
  if (!color?.trim()) return res.status(400).json({ error: 'Color is required' });
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  if (!stock || isNaN(parseInt(stock)) || parseInt(stock) < 0) {
    return res.status(400).json({ error: 'Valid stock is required' });
  }
  
  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      sku: sku.trim(),
      category: category.trim(),
      size: size.trim(),
      color: color.trim(),
      price: parseFloat(price),
      stock: parseInt(stock),
      image: req.file?.filename || null
    }
  });
  
  res.status(201).json(product);
}));

app.put('/api/products/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
  
  const { name, sku, category, size, color, price, discount, onOffer, stock } = req.body;
  
  if (name && !name.trim()) return res.status(400).json({ error: 'Name cannot be empty' });
  if (price && (isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
    return res.status(400).json({ error: 'Valid price is required' });
  }
  if (stock && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
    return res.status(400).json({ error: 'Valid stock is required' });
  }
  
  const data = {};
  if (name) data.name = name.trim();
  if (sku) data.sku = sku.trim();
  if (category) data.category = category.trim();
  if (size) data.size = size.trim();
  if (color) data.color = color.trim();
  if (price) data.price = parseFloat(price);
  if (discount !== undefined) data.discount = parseFloat(discount) || 0;
  if (onOffer !== undefined) data.onOffer = onOffer === 'true' || onOffer === true;
  if (stock) data.stock = parseInt(stock);
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
app.post('/api/sales', async (req, res) => {
  try {
    const { userId, productId, quantity } = req.body;
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const sale = await prisma.sale.create({
      data: { userId, productId, quantity, total: product.price * quantity }
    });
    res.json(sale);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
