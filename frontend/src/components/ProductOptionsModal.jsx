import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'
import Modal from './Modal'
import ProductConfigurator from './ProductConfigurator'

export default function ProductOptionsModal({ family, onClose }) {
  const [activeProduct, setActiveProduct] = useState(family?.product || null)

  useEffect(() => {
    setActiveProduct(family?.product || null)
  }, [family])

  const handleVariantChange = useCallback((product) => {
    if (product) setActiveProduct(product)
  }, [])

  return (
    <Modal
      open={Boolean(family)}
      onClose={onClose}
      title={family?.product?.name || 'Opciones del producto'}
      description="Elige la variante y la cantidad antes de agregarla."
      size="max-w-4xl"
    >
      {family && (
        <div className="grid gap-0 md:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[#f1e8e1] p-4 sm:p-6">
            <ProductImage
              product={activeProduct}
              alt={`${activeProduct?.name || family.product.name} en color ${activeProduct?.color || family.product.color}`}
              className="aspect-[4/5] w-full rounded-[1.25rem] object-cover shadow-sm"
            />
            <Link
              to={`/product/${family.product.id}`}
              onClick={onClose}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#4f102b]/15 bg-white px-4 text-sm font-bold text-[#4f102b] transition hover:bg-[#fbf5f7]"
            >
              Ver todos los detalles
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="p-5 sm:p-7">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8b737d]">{family.product.brand}</p>
              <p className="mt-2 text-sm leading-6 text-[#6e5b63]">
                Disponible en {family.variants.length} {family.variants.length === 1 ? 'color' : 'colores'}.
              </p>
            </div>
            <ProductConfigurator
              family={family}
              onVariantChange={handleVariantChange}
              onAdded={onClose}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
