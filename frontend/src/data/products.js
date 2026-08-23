export const availableFiles = [
  'BeichV_Sincere.jpg', 'Beich_Nike.jpg', 'Beich_Oversize.jpg', 'Beich_Sincere.jpg',
  'Blanco_Sincere.jpg', 'B_Oversize.jpg', 'C_NewEra.jpg', 'C_Nike.jpg', 'Gris_Nike.jpg',
  'N_NewEra.jpg', 'N_Nike.jpg', 'N_Oversize.jpg', 'N_Sincere.jpg', 'Palazo.jpg',
  'R_NewEra.jpg', 'R_Nike.jpg', 'V_Sincere.jpg',
]

export const getImageUrl = (file) => `/img_wf/${file}`

export const getProductImageUrl = (product) => {
  if (!product) return null
  if (product.image) {
    const image = String(product.image).trim()
    if (/^(https?:|data:|blob:|\/\/)/i.test(image)) return null
    if (image.startsWith('/img_wf/')) {
      const file = image.slice('/img_wf/'.length)
      return availableFiles.includes(file) ? getImageUrl(file) : null
    }
    if (availableFiles.includes(image)) return getImageUrl(image)

    const apiBase = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '')
    const uploadPath = image.startsWith('/uploads/')
      ? image
      : image.startsWith('products/') ? `/uploads/${image}` : null
    if (!uploadPath) return null
    return `${apiBase}${uploadPath}`
  }
  if (availableFiles.includes(product.file)) return getImageUrl(product.file)
  return null
}
