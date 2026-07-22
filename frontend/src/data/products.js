export const products = [
  { id: 'B_Oversize', file: 'B_Oversize.jpg', name: 'Sacos Oversize', brand: 'Oversize', color: 'Blanco', category: 'Hombre', price: 18, stock: 14, onOffer: false },
  { id: 'Beich_Nike', file: 'Beich_Nike.jpg', name: 'Conjunto Nike', brand: 'Nike', color: 'Beich', category: 'Hombre', price: 30, stock: 9, onOffer: false },
  { id: 'Beich_Oversize', file: 'Beich_Oversize.jpg', name: 'Sacos Oversize', brand: 'Oversize', color: 'Beich', category: 'Hombre', price: 18, stock: 10, onOffer: false },
  { id: 'Beich_Sincere', file: 'Beich_Sincere.jpg', name: 'Sincere', brand: 'Sincere', color: 'Beich', category: 'Mujer', price: 18, stock: 8, onOffer: false },
  { id: 'BeichV_Sincere', file: 'BeichV_Sincere.jpg', name: 'Sincere', brand: 'Sincere', color: 'Beich Verde', category: 'Mujer', price: 18, stock: 6, onOffer: false },
  { id: 'Blanco_Sincere', file: 'Blanco_Sincere.jpg', name: 'Sincere', brand: 'Sincere', color: 'Blanco', category: 'Mujer', price: 18, stock: 12, onOffer: false },
  { id: 'C_NewEra', file: 'C_NewEra.jpg', name: 'Conjunto New Era', brand: 'NewEra', color: 'Celeste', category: 'Hombre', price: 20, stock: 7, onOffer: false },
  { id: 'C_Nike', file: 'C_Nike.jpg', name: 'Conjunto Nike', brand: 'Nike', color: 'Celeste', category: 'Hombre', price: 30, stock: 5, onOffer: false },
  { id: 'Gris_Nike', file: 'Gris_Nike.jpg', name: 'Conjunto Nike', brand: 'Nike', color: 'Gris', category: 'Hombre', price: 30, stock: 5, onOffer: false },
  { id: 'N_NewEra', file: 'N_NewEra.jpg', name: 'Conjunto New Era', brand: 'NewEra', color: 'Negro', category: 'Hombre', price: 20, stock: 9, onOffer: false },
  { id: 'N_Nike', file: 'N_Nike.jpg', name: 'Conjunto Nike', brand: 'Nike', color: 'Negro', category: 'Hombre', price: 30, stock: 12, onOffer: false },
  { id: 'N_Oversize', file: 'N_Oversize.jpg', name: 'Sacos Oversize', brand: 'Oversize', color: 'Negro', category: 'Hombre', price: 18, stock: 14, onOffer: false },
  { id: 'N_Sincere', file: 'N_Sincere.jpg', name: 'Sincere', brand: 'Sincere', color: 'Negro', category: 'Mujer', price: 18, stock: 11, onOffer: false },
  { id: 'R_NewEra', file: 'R_NewEra.jpg', name: 'Conjunto New Era', brand: 'NewEra', color: 'Rojo', category: 'Hombre', price: 20, stock: 4, onOffer: false },
  { id: 'R_Nike', file: 'R_Nike.jpg', name: 'Conjunto Nike', brand: 'Nike', color: 'Rojo', category: 'Hombre', price: 25, stock: 5, onOffer: true },
  { id: 'V_Sincere', file: 'V_Sincere.jpg', name: 'Sincere', brand: 'Sincere', color: 'Verde', category: 'Mujer', price: 18, stock: 7, onOffer: false }
]

export const getImageUrl = (file) => `/img_wf/${file}`

export const getProductImageUrl = (product) => {
  if (!product) return getImageUrl('Palazo.jpg')
  if (product.image) {
    if (/^(https?:|data:|blob:)/i.test(product.image)) return product.image
    if (product.image.startsWith('/img_wf/')) return product.image
    if (availableFiles.includes(product.image)) return getImageUrl(product.image)

    const apiBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
    const uploadPath = product.image.startsWith('/') ? product.image : `/uploads/${product.image}`
    return `${apiBase}${uploadPath}`
  }
  if (product.file) return getImageUrl(product.file)
  return getImageUrl('placeholder.svg')
}

// Nuevo producto: Palazo (Mujer) — tallas S-M-L-XL, precio $12
products.push({
  id: 'Palazo_Mujer',
  file: 'Palazo.jpg',
  name: 'Palazo',
  brand: 'Wilmas',
  color: 'Rojo',
  category: 'Mujer',
  price: 12,
  stock: 8,
  onOffer: false,
  sizes: ['S', 'M', 'L', 'XL']
})

// Archivos presentes en public/img_wf — edición generada desde el workspace
export const availableFiles = [
  'BeichV_Sincere.jpg',
  'Beich_Nike.jpg',
  'Beich_Oversize.jpg',
  'Beich_Sincere.jpg',
  'Blanco_Sincere.jpg',
  'B_Oversize.jpg',
  'C_NewEra.jpg',
  'C_Nike.jpg',
  'Gris_Nike.jpg',
  'N_NewEra.jpg',
  'N_Nike.jpg',
  'N_Oversize.jpg',
  'N_Sincere.jpg',
  'Palazo.jpg',
  'Palazo.svg',
  'R_NewEra.jpg',
  'R_Nike.jpg',
  'V_Sincere.jpg',
]

export const availableProducts = products.filter((p) => availableFiles.includes(p.file))
