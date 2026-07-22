import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLocalProducts, groupProductFamilies } from '../services/productService'
import ProductCard from './ProductCard'
import ProductOptionsModal from './ProductOptionsModal'

export default function FeaturedProducts() {
  const [selectedFamily, setSelectedFamily] = useState(null)
  const featured = useMemo(
    () => groupProductFamilies(getLocalProducts()).filter((family) => family.product.category === 'Hombre').slice(0, 4),
    []
  )

  return (
    <section aria-labelledby="featured-title" className="py-4 sm:py-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Selección Wilmas</p>
          <h2 id="featured-title" className="section-title mt-3">Esenciales que elevan lo cotidiano</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6f5c64] sm:text-base">
            Siluetas cómodas, tonos fáciles de combinar y detalles pensados para acompañarte.
          </p>
        </div>
        <Link to="/catalog" className="text-link shrink-0">Ver colección <span aria-hidden="true">→</span></Link>
      </div>

      <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
        {featured.map((family) => (
          <ProductCard key={family.key} family={family} onQuickAdd={setSelectedFamily} />
        ))}
      </div>

      <ProductOptionsModal family={selectedFamily} onClose={() => setSelectedFamily(null)} />
    </section>
  )
}
