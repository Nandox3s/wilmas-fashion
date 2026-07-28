import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ProductOptionsModal from '../components/ProductOptionsModal'
import { groupProductFamilies, loadCatalogProducts } from '../services/productService'

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[#34222a]/10 bg-white" aria-hidden="true">
      <div className="skeleton aspect-[4/5]" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-3 w-24 rounded-full" />
        <div className="skeleton h-6 w-3/4 rounded-full" />
        <div className="skeleton h-4 w-1/2 rounded-full" />
        <div className="flex items-center justify-between pt-3">
          <div className="skeleton h-6 w-24 rounded-full" />
          <div className="skeleton h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default function Catalog() {
  const { name: categoryParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState('local')
  const [selectedBrand, setSelectedBrand] = useState('Todas')
  const [selectedFamily, setSelectedFamily] = useState(null)
  const query = searchParams.get('q') || ''

  useEffect(() => {
    let active = true
    setLoading(true)
    loadCatalogProducts().then((result) => {
      if (!active) return
      setProducts(result.products)
      setSource(result.source)
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    setSelectedBrand('Todas')
    setSelectedFamily(null)
  }, [categoryParam])

  const scopedProducts = useMemo(() => {
    const normalizedCategory = String(categoryParam || '').toLocaleLowerCase()
    return products.filter((product) => {
      if (!normalizedCategory) return true
      if (normalizedCategory === 'ofertas') return Boolean(product.onOffer || product.discount)
      return product.category.toLocaleLowerCase() === normalizedCategory
    })
  }, [categoryParam, products])

  const brands = useMemo(
    () => ['Todas', ...new Set(scopedProducts.map((product) => product.brand))],
    [scopedProducts]
  )

  const families = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return groupProductFamilies(scopedProducts).filter((family) => {
      const matchesBrand = selectedBrand === 'Todas' || family.product.brand === selectedBrand
      const haystack = [
        family.product.name,
        family.product.brand,
        family.product.category,
        ...family.variants.map((variant) => variant.color),
      ].join(' ').toLocaleLowerCase()
      return matchesBrand && (!normalizedQuery || haystack.includes(normalizedQuery))
    })
  }, [query, scopedProducts, selectedBrand])

  const title = categoryParam
    ? categoryParam.toLocaleLowerCase() === 'ofertas'
      ? 'Piezas especiales, precios inesperados'
      : `Colección ${categoryParam}`
    : 'Vestir bien empieza por elegirte'

  function updateQuery(value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set('q', value)
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f8f3ef]">
      <section className="relative overflow-hidden border-b border-[#39232c]/10 bg-[#24131b] px-4 py-14 text-white sm:py-20">
        <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_15%_20%,rgba(165,65,100,.34),transparent_32%),radial-gradient(circle_at_90%_5%,rgba(212,175,55,.2),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl">
          <nav aria-label="Migas de pan" className="mb-7 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white">Inicio</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Catálogo</span>
          </nav>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e8c978]">Nueva mirada · 2026</p>
          <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/[0.72] sm:text-base">
            Explora cada silueta, compara sus colores y elige la variante que se siente hecha para ti.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="rounded-[1.5rem] border border-[#39232c]/10 bg-white/90 p-4 shadow-[0_12px_45px_rgba(49,24,34,0.06)] sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <label htmlFor="catalog-search" className="sr-only">Buscar en el catálogo</label>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#806e75]" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" /><path d="m16 16 4 4" />
              </svg>
              <input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder="Buscar prenda, marca o color"
                className="input-field input-with-icon"
              />
            </div>
            <p className="text-sm text-[#705d65]" aria-live="polite">
              {loading ? 'Preparando colección…' : `${families.length} ${families.length === 1 ? 'estilo encontrado' : 'estilos encontrados'}`}
            </p>
          </div>

          <div className="mt-5 border-t border-[#39232c]/10 pt-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#806e75]">Filtrar por marca</p>
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por marca">
              {brands.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  aria-pressed={selectedBrand === brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition ${selectedBrand === brand
                    ? 'border-[#6d1738] bg-[#6d1738] text-white'
                    : 'border-[#39232c]/[0.12] bg-[#fffdf9] text-[#5c4650] hover:border-[#6d1738]/35'}`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>

        {source === 'local' && !loading && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#a86c27]/20 bg-[#fff9ed] px-4 py-3 text-sm leading-6 text-[#715022]" role="status">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>
            Mostramos el catálogo disponible. La sincronización de inventario se retomará cuando la API esté conectada.
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Cargando productos">
            {Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}
          </div>
        ) : families.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {families.map((family) => (
              <ProductCard key={family.key} family={family} onQuickAdd={setSelectedFamily} />
            ))}
          </div>
        ) : (
          <section className="mt-8 rounded-[2rem] border border-dashed border-[#6d1738]/25 bg-white px-5 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f7ebef] text-[#6d1738]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>
            </span>
            <h2 className="mt-5 font-serif text-3xl font-semibold text-[#28161e]">No encontramos esa combinación</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#705d65]">Prueba otra palabra, cambia de marca o vuelve a ver toda la colección.</p>
            <button type="button" onClick={() => { updateQuery(''); setSelectedBrand('Todas') }} className="button-secondary mt-6">
              Limpiar filtros
            </button>
          </section>
        )}
      </main>

      <ProductOptionsModal family={selectedFamily} onClose={() => setSelectedFamily(null)} />
    </div>
  )
}
