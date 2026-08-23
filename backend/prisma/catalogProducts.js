export const catalogProducts = [
  { sku: 'B_OVERSIZE', name: 'Sacos Oversize', brand: 'Oversize', category: 'Hombre', sizes: [], color: 'Blanco', price: 18, stock: 14, image: '/img_wf/B_Oversize.jpg' },
  { sku: 'BEICH_NIKE', name: 'Conjunto Nike', brand: 'Nike', category: 'Hombre', sizes: [], color: 'Beige', price: 30, stock: 9, image: '/img_wf/Beich_Nike.jpg' },
  { sku: 'BEICH_OVERSIZE', name: 'Sacos Oversize', brand: 'Oversize', category: 'Hombre', sizes: [], color: 'Beige', price: 18, stock: 10, image: '/img_wf/Beich_Oversize.jpg' },
  { sku: 'BEICH_SINCERE', name: 'Sincere', brand: 'Sincere', category: 'Mujer', sizes: [], color: 'Beige', price: 18, stock: 8, image: '/img_wf/Beich_Sincere.jpg' },
  { sku: 'BEICHV_SINCERE', name: 'Sincere', brand: 'Sincere', category: 'Mujer', sizes: [], color: 'Beige Verde', price: 18, stock: 6, image: '/img_wf/BeichV_Sincere.jpg' },
  { sku: 'BLANCO_SINCERE', name: 'Sincere', brand: 'Sincere', category: 'Mujer', sizes: [], color: 'Blanco', price: 18, stock: 12, image: '/img_wf/Blanco_Sincere.jpg' },
  { sku: 'C_NEWERA', name: 'Conjunto New Era', brand: 'NewEra', category: 'Hombre', sizes: [], color: 'Celeste', price: 20, stock: 7, image: '/img_wf/C_NewEra.jpg' },
  { sku: 'C_NIKE', name: 'Conjunto Nike', brand: 'Nike', category: 'Hombre', sizes: [], color: 'Celeste', price: 30, stock: 5, image: '/img_wf/C_Nike.jpg' },
  { sku: 'GRIS_NIKE', name: 'Conjunto Nike', brand: 'Nike', category: 'Hombre', sizes: [], color: 'Gris', price: 30, stock: 5, image: '/img_wf/Gris_Nike.jpg' },
  { sku: 'N_NEWERA', name: 'Conjunto New Era', brand: 'NewEra', category: 'Hombre', sizes: [], color: 'Negro', price: 20, stock: 9, image: '/img_wf/N_NewEra.jpg' },
  { sku: 'N_NIKE', name: 'Conjunto Nike', brand: 'Nike', category: 'Hombre', sizes: [], color: 'Negro', price: 30, stock: 12, image: '/img_wf/N_Nike.jpg' },
  { sku: 'N_OVERSIZE', name: 'Sacos Oversize', brand: 'Oversize', category: 'Hombre', sizes: [], color: 'Negro', price: 18, stock: 14, image: '/img_wf/N_Oversize.jpg' },
  { sku: 'N_SINCERE', name: 'Sincere', brand: 'Sincere', category: 'Mujer', sizes: [], color: 'Negro', price: 18, stock: 11, image: '/img_wf/N_Sincere.jpg' },
  { sku: 'PALAZO_MUJER', name: 'Palazzo', brand: 'Wilmas', category: 'Mujer', sizes: ['S', 'M', 'L', 'XL'], color: 'Rojo', price: 12, stock: 8, image: '/img_wf/Palazo.jpg' },
  { sku: 'R_NEWERA', name: 'Conjunto New Era', brand: 'NewEra', category: 'Hombre', sizes: [], color: 'Rojo', price: 20, stock: 4, image: '/img_wf/R_NewEra.jpg' },
  { sku: 'R_NIKE', name: 'Conjunto Nike', brand: 'Nike', category: 'Hombre', sizes: [], color: 'Rojo', price: 25, stock: 5, image: '/img_wf/R_Nike.jpg' },
  { sku: 'V_SINCERE', name: 'Sincere', brand: 'Sincere', category: 'Mujer', sizes: [], color: 'Verde', price: 18, stock: 7, image: '/img_wf/V_Sincere.jpg' },
]

export const legacyProductWhere = {
  isActive: true,
  OR: [
    { sku: { in: ['CAM001', 'JEA001', 'VES001', 'FAL001', 'CIN001', 'SOM001', 'PAL001'] } },
    { sku: { startsWith: 'E2E-SKU-' } },
    { sku: { startsWith: 'DBG-' } },
    { brand: { in: ['E2E', 'DBG'] } },
  ],
}
