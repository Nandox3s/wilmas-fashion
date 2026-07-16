import React, { useEffect, useState } from 'react'
import axios from 'axios'

function parseSizes(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch {
    return value.split(',').map((size) => size.trim()).filter(Boolean)
  }
}

function resolveImageUrl(image) {
  if (!image) return ''
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image
  if (image.startsWith('/img_wf/')) return image
  const path = image.startsWith('/') ? image : `/uploads/${image}`
  const apiBase = axios.defaults.baseURL
  return apiBase && /^https?:\/\//i.test(apiBase)
    ? `${apiBase.replace(/\/$/, '')}${path}`
    : path
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}

export default function ProductsOverview() {
  const [products, setProducts] = useState([])
  const [stats, setStats] = useState({ totalProducts: 0, onOfferCount: 0, lowStockCount: 0 })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProducts('', 1)
  }, [])

  async function loadProducts(search = appliedQuery, page = 1) {
    setLoading(true)
    setError('')

    const [productsResult, statsResult] = await Promise.allSettled([
      axios.get('/api/products', { params: { limit: 100, page, ...(search ? { search } : {}) } }),
      axios.get('/api/stats/overview')
    ])

    if (productsResult.status === 'fulfilled') {
      const data = productsResult.value.data || {}
      const items = Array.isArray(data.items) ? data.items : []
      setProducts(items)
      setPagination({
        page: Number(data.page) || page,
        pages: Math.max(1, Number(data.pages) || 1),
        total: Number(data.total) || 0
      })
      setAppliedQuery(search)
      if (statsResult.status === 'rejected') {
        setStats({
          totalProducts: Number(data.total) || items.length,
          onOfferCount: items.filter((product) => product.onOffer).length,
          lowStockCount: items.filter((product) => Number(product.stock) < 10).length
        })
      }
    } else {
      setError(productsResult.reason?.response?.data?.error || 'No se pudo cargar el catálogo desde la API.')
    }

    if (statsResult.status === 'fulfilled') {
      setStats({
        totalProducts: Number(statsResult.value.data?.totalProducts) || 0,
        onOfferCount: Number(statsResult.value.data?.onOfferCount) || 0,
        lowStockCount: Number(statsResult.value.data?.lowStockCount) || 0
      })
    }
    setLoading(false)
  }

  function submitSearch(event) {
    event.preventDefault()
    loadProducts(query.trim(), 1)
  }

  function clearSearch() {
    setQuery('')
    loadProducts('', 1)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#5B0E2D]">Inventario en vivo</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Vista general de productos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Información sincronizada con el catálogo del backend: precios, ofertas y existencias.</p>
          </div>

          <form onSubmit={submitSearch} role="search" className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:max-w-xl">
            <label htmlFor="overview-search" className="sr-only">Buscar en el inventario</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input id="overview-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, SKU o color" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#5B0E2D] focus:ring-2 focus:ring-[#5B0E2D]/10" />
              <div className="flex gap-2">
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-[#5B0E2D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2 disabled:opacity-50 sm:flex-none">Buscar</button>
                {appliedQuery && <button type="button" onClick={clearSearch} disabled={loading} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50 sm:flex-none">Limpiar</button>}
              </div>
            </div>
          </form>
        </div>

        <section aria-label="Estadísticas del inventario" className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total productos" value={stats.totalProducts} />
          <StatCard label="En oferta" value={stats.onOfferCount} accent="emerald" />
          <StatCard label="Stock bajo" value={stats.lowStockCount} accent={stats.lowStockCount > 0 ? 'amber' : 'default'} />
        </section>

        {error && (
          <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => loadProducts(appliedQuery, pagination.page)} className="self-start rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 sm:self-auto">Reintentar</button>
          </div>
        )}

        <section aria-labelledby="overview-results-title" className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2 id="overview-results-title" className="font-bold text-slate-950">Productos disponibles</h2>
              <p className="mt-0.5 text-xs text-slate-500">{appliedQuery ? `${pagination.total} coincidencias para “${appliedQuery}”` : `${pagination.total} productos en el catálogo`}</p>
            </div>
            <button type="button" onClick={() => loadProducts(appliedQuery, pagination.page)} disabled={loading} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50">
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>

          {loading ? (
            <div aria-live="polite" aria-busy="true" className="space-y-3 p-5 sm:p-6">
              <span className="sr-only">Cargando productos</span>
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-lg font-bold text-slate-800">No encontramos productos</h3>
              <p className="mt-2 text-sm text-slate-500">Prueba con otro nombre, SKU o color.</p>
              {appliedQuery && <button type="button" onClick={clearSearch} className="mt-5 rounded-xl bg-[#5B0E2D] px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2">Ver todo el catálogo</button>}
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {products.map((product) => <MobileProduct key={product.id} product={product} />)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-3">Producto</th>
                      <th scope="col" className="px-4 py-3">Categoría</th>
                      <th scope="col" className="px-4 py-3">Tallas</th>
                      <th scope="col" className="px-4 py-3">Precio</th>
                      <th scope="col" className="px-4 py-3">Stock</th>
                      <th scope="col" className="px-6 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => <ProductRow key={product.id} product={product} />)}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {pagination.pages > 1 && !loading && (
            <nav aria-label="Paginación de productos" className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <button type="button" onClick={() => loadProducts(appliedQuery, pagination.page - 1)} disabled={pagination.page <= 1} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
              <span className="text-sm text-slate-500">Página {pagination.page} de {pagination.pages}</span>
              <button type="button" onClick={() => loadProducts(appliedQuery, pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:cursor-not-allowed disabled:opacity-40">Siguiente</button>
            </nav>
          )}
        </section>
      </main>
    </div>
  )
}

function ProductRow({ product }) {
  const sizes = parseSizes(product.sizes ?? product.size)
  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-6 py-4"><ProductIdentity product={product} /></td>
      <td className="px-4 py-4 text-slate-600">{product.category}</td>
      <td className="px-4 py-4 text-slate-600">{sizes.join(', ') || '—'}</td>
      <td className="px-4 py-4">
        <div className="font-semibold text-slate-900">{formatMoney(product.price)}</div>
        {product.onOffer && <div className="mt-0.5 text-xs font-semibold text-emerald-700">{Number(product.discount) || 0}% de descuento</div>}
      </td>
      <td className="px-4 py-4"><StockBadge stock={product.stock} /></td>
      <td className="px-6 py-4">{product.onOffer ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Oferta</span> : <span className="text-xs text-slate-500">Precio regular</span>}</td>
    </tr>
  )
}

function MobileProduct({ product }) {
  const sizes = parseSizes(product.sizes ?? product.size)
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <ProductIdentity product={product} />
        <StockBadge stock={product.stock} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
        <div><dt className="text-xs text-slate-500">Categoría</dt><dd className="mt-0.5 font-medium text-slate-800">{product.category}</dd></div>
        <div><dt className="text-xs text-slate-500">Tallas</dt><dd className="mt-0.5 font-medium text-slate-800">{sizes.join(', ') || '—'}</dd></div>
        <div><dt className="text-xs text-slate-500">Precio</dt><dd className="mt-0.5 font-bold text-slate-950">{formatMoney(product.price)}</dd></div>
        <div><dt className="text-xs text-slate-500">Estado</dt><dd className="mt-0.5 font-medium text-slate-800">{product.onOffer ? `Oferta −${Number(product.discount) || 0}%` : 'Precio regular'}</dd></div>
      </dl>
    </article>
  )
}

function ProductIdentity({ product }) {
  const [failed, setFailed] = useState(false)
  const source = resolveImageUrl(product.image)
  useEffect(() => setFailed(false), [source])
  return (
    <div className="flex min-w-0 items-center gap-3">
      {source && !failed ? <img src={source} onError={() => setFailed(true)} alt={`Miniatura de ${product.name}`} className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" /> : <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">WF</div>}
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-900">{product.name}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{product.brand || 'Sin marca'} · {product.sku}</div>
        <div className="mt-0.5 truncate text-xs text-slate-400">{product.color || 'Sin color'}</div>
      </div>
    </div>
  )
}

function StockBadge({ stock }) {
  const value = Number(stock) || 0
  const classes = value === 0 ? 'bg-red-100 text-red-700' : value < 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
  return <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{value} uds.</span>
}

function StatCard({ label, value, accent = 'default' }) {
  const color = accent === 'amber' ? 'text-amber-700' : accent === 'emerald' ? 'text-emerald-700' : 'text-slate-950'
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${color}`}>{value}</p>
    </article>
  )
}
