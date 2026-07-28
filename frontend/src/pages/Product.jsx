import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductConfigurator from '../components/ProductConfigurator'
import { getProductImageUrl } from '../data/products'
import { findProductFamily, loadCatalogProducts } from '../services/productService'
import { formatCurrency } from '../utils/cart'

function ProductPageSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-2" aria-label="Cargando producto">
      <div className="skeleton aspect-[4/5] rounded-[2rem]" />
      <div className="space-y-5 py-4">
        <div className="skeleton h-4 w-28 rounded-full" />
        <div className="skeleton h-14 w-4/5 rounded-2xl" />
        <div className="skeleton h-7 w-32 rounded-full" />
        <div className="skeleton h-40 rounded-[1.5rem]" />
        <div className="skeleton h-14 rounded-full" />
      </div>
    </div>
  )
}
export default function Product() {
  const { id } = useParams()
  const [family, setFamily] = useState(null)
  const [activeProduct, setActiveProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    loadCatalogProducts().then(({ products }) => {
      if (!active) return
      const nextFamily = findProductFamily(products, id)
      setFamily(nextFamily)
      setActiveProduct(nextFamily?.product || null)
      setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const handleVariantChange = useCallback((product) => {
    if (product) setActiveProduct(product)
  }, [])

  if (loading) return <ProductPageSkeleton />

  if (!family) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="rounded-[2rem] border border-dashed border-[#6d1738]/25 bg-white px-6 py-16">
          <p className="eyebrow">Referencia no disponible</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-[#28161e]">Esta prenda ya no está en el perchero</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-[#705d65]">Puede haberse agotado o el enlace ya no estar vigente. La colección actual te espera a un paso.</p>
          <Link to="/catalog" className="button-primary mt-7">Volver al catálogo</Link>
        </div>
      </main>
    )
  }

  const displayProduct = activeProduct || family.product
  const effectivePrice = displayProduct.price * (1 - (displayProduct.discount || 0) / 100)

  return (
    <main className="bg-[#f8f3ef] pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-9">
        <nav aria-label="Migas de pan" className="flex flex-wrap items-center gap-2 text-sm text-[#705d65]">
          <Link to="/" className="hover:text-[#6d1738]">Inicio</Link>
          <span aria-hidden="true">/</span>
          <Link to="/catalog" className="hover:text-[#6d1738]">Catálogo</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-[#2a1820]">{family.product.name}</span>
        </nav>

        <div className="mt-6 grid items-start gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <section aria-label="Galería del producto" className="lg:sticky lg:top-28">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#eadfd8] shadow-[0_22px_70px_rgba(49,24,34,0.12)] sm:rounded-[2.25rem]">
              <img
                src={getProductImageUrl(displayProduct)}
                alt={`${displayProduct.name} de ${displayProduct.brand}, color ${displayProduct.color}`}
                className="aspect-[4/5] max-h-[780px] w-full object-cover"
                onError={(event) => { event.currentTarget.src = '/img_wf/placeholder.svg' }}
              />
              {displayProduct.onOffer && (
                <span className="absolute left-4 top-4 rounded-full bg-[#6d1738] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white">
                  Precio especial
                </span>
              )}
            </div>
            {family.variants.length > 1 && (
              <p className="mt-4 text-center text-sm text-[#705d65]">La imagen cambia al elegir un color.</p>
            )}
          </section>

          <section className="rounded-[1.75rem] border border-[#39232c]/10 bg-[#fffdf9] p-5 shadow-[0_18px_55px_rgba(49,24,34,0.08)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#39232c]/10 pb-6">
              <div>
                <p className="eyebrow">{displayProduct.brand} · {displayProduct.category}</p>
                <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-[#28161e] sm:text-5xl">{displayProduct.name}</h1>
                <p className="mt-3 text-sm text-[#806e75]">Referencia {displayProduct.sku || displayProduct.id}</p>
              </div>
              <Link
                to="/cart"
                aria-label="Ver carrito"
                className="grid h-12 w-12 place-items-center rounded-full border border-[#39232c]/10 bg-white text-[#4f102b] transition hover:bg-[#f8edf1]"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h2l1.4 8.1a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 2-1.6L20 9H7M10 20h.01M17 20h.01"/></svg>
              </Link>
            </div>

            <div className="flex flex-wrap items-end gap-3 py-6">
              <p className="font-serif text-4xl font-semibold text-[#4f102b]">{formatCurrency(effectivePrice)}</p>
              {displayProduct.discount > 0 && (
                <>
                  <p className="mb-1 text-base text-[#8a747d] line-through">{formatCurrency(displayProduct.price)}</p>
                  <span className="mb-1 rounded-full bg-[#f5e7c6] px-3 py-1 text-xs font-bold text-[#6f4b13]">-{displayProduct.discount}%</span>
                </>
              )}
            </div>

            <ProductConfigurator family={family} onVariantChange={handleVariantChange} />

            <div className="mt-7 grid gap-3 border-t border-[#39232c]/10 pt-6 sm:grid-cols-3">
              {[
                ['Entrega cuidada', 'Empaque protegido para tu pedido'],
                ['Compra flexible', 'Ajusta tu carrito antes de pagar'],
                ['Atención cercana', 'Estamos para ayudarte a elegir'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl bg-[#f7f0eb] p-4">
                  <p className="text-sm font-bold text-[#3a222c]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#76636b]">{copy}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
