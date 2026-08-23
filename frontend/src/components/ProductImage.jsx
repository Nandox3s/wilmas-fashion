import { useEffect, useState } from 'react'
import { getProductImageUrl } from '../data/products'

export default function ProductImage({ product, alt, className = '', loading, fallbackClassName = '', ...props }) {
  const source = getProductImageUrl(product)
  const [failed, setFailed] = useState(false)

  useEffect(() => { setFailed(false) }, [source])

  if (!source || failed) {
    return (
      <div
        className={`product-image-fallback ${className} ${fallbackClassName}`.trim()}
        role="img"
        aria-label={alt || 'Imagen no disponible'}
        {...props}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M12 9h24a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" />
          <path d="m13 34 8-9 6 6 4-4 8 8M31 17h.01" />
        </svg>
        <span>Imagen no disponible</span>
      </div>
    )
  }

  return <img src={source} alt={alt} className={className} loading={loading} onError={() => setFailed(true)} {...props} />
}
