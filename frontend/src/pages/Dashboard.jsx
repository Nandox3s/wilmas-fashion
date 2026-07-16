import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { Line } from 'react-chartjs-2'
import Sidebar from '../components/Sidebar'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const ProductTableLazy = React.lazy(() => import('../components/ProductTable'))

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}

function buildSalesSeries(sales) {
  const totals = new Map()
  for (const sale of Array.isArray(sales) ? sales : []) {
    const date = new Date(sale.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const key = date.toISOString().slice(0, 10)
    totals.set(key, (totals.get(key) || 0) + (Number(sale.total) || 0))
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-7)
    .map(([date, total]) => ({
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      total
    }))
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const role = localStorage.getItem('role') || 'CUSTOMER'

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    setError('')

    const baseRequests = [
      axios.get('/api/stats/overview'),
      axios.get('/api/products', { params: { limit: 100 } })
    ]
    const [overviewResult, productsResult] = await Promise.allSettled(baseRequests)

    if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data)
    if (productsResult.status === 'fulfilled') {
      setProducts(Array.isArray(productsResult.value.data?.items) ? productsResult.value.data.items : [])
    }

    let analyticsFailed = false
    if (role === 'ADMIN') {
      try {
        const response = await axios.get('/api/analytics/dashboard', { headers: authHeaders() })
        setAnalytics(response.data)
      } catch {
        analyticsFailed = true
      }
    } else {
      setAnalytics(null)
    }

    const baseFailed = overviewResult.status === 'rejected' && productsResult.status === 'rejected'
    if (baseFailed) setError('No se pudo cargar la información del panel.')
    else if (analyticsFailed) setError('El inventario está disponible, pero las métricas de ventas no pudieron cargarse.')
    setLoading(false)
  }

  const lowStockProducts = useMemo(
    () => products.filter((product) => Number(product.stock) < 10).sort((left, right) => Number(left.stock) - Number(right.stock)),
    [products]
  )
  const salesSeries = useMemo(() => buildSalesSeries(analytics?.recentSales), [analytics])

  const chartData = {
    labels: salesSeries.map((entry) => entry.label),
    datasets: [{
      label: 'Ingresos',
      data: salesSeries.map((entry) => entry.total),
      borderColor: '#5B0E2D',
      backgroundColor: 'rgba(91, 14, 45, 0.12)',
      pointBackgroundColor: '#D4AF37',
      pointBorderColor: '#5B0E2D',
      pointRadius: 4,
      tension: 0.35,
      fill: true
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => formatMoney(context.parsed.y) } }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b' } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.18)' },
        ticks: { color: '#64748b', callback: (value) => `$${value}` }
      }
    }
  }

  const totalProducts = overview?.totalProducts ?? products.length
  const lowStockCount = overview?.lowStockCount ?? lowStockProducts.length

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <main className="min-w-0 px-4 py-6 sm:px-6 md:ml-72 md:px-8 md:py-8" id="main-content">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#5B0E2D]">Wilmas Fashion</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Resumen del negocio</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Inventario y ventas calculados con los datos actuales de la tienda.</p>
            </div>
            <button type="button" onClick={loadDashboard} disabled={loading} className="self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
              {loading ? 'Actualizando…' : 'Actualizar datos'}
            </button>
          </div>

          {error && (
            <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button type="button" onClick={loadDashboard} className="self-start rounded-lg border border-amber-300 px-3 py-2 font-semibold hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 sm:self-auto">Reintentar</button>
            </div>
          )}

          {loading && !overview && products.length === 0 ? (
            <DashboardSkeleton />
          ) : (
            <>
              <section aria-label="Indicadores principales" className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Productos" value={totalProducts} detail={`${overview?.onOfferCount ?? products.filter((product) => product.onOffer).length} en oferta`} />
                <MetricCard label="Ventas registradas" value={analytics ? analytics.totalSales : '—'} detail={role === 'ADMIN' ? 'Histórico de ventas' : 'Métrica para administradores'} />
                <MetricCard label="Ingresos" value={analytics ? formatMoney(analytics.totalRevenue) : '—'} detail="Total registrado" />
                <MetricCard label="Stock bajo" value={lowStockCount} detail="Menos de 10 unidades" warning={lowStockCount > 0} />
              </section>

              <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Actividad reciente</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">Ingresos por día</h2>
                    </div>
                    {analytics?.totalUsers !== undefined && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{analytics.totalUsers} usuarios</span>}
                  </div>
                  {salesSeries.length > 0 ? (
                    <div role="img" aria-label="Gráfico de ingresos de las ventas recientes" className="mt-5 h-72">
                      <Line data={chartData} options={chartOptions} />
                    </div>
                  ) : (
                    <div className="mt-5 grid h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                      <div>
                        <p className="font-semibold text-slate-800">Aún no hay ventas recientes</p>
                        <p className="mt-1 text-sm text-slate-500">El gráfico aparecerá cuando se registren ventas.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Inventario</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">Productos con stock bajo</h2>
                  <div className="mt-4">
                    {lowStockProducts.length > 0 ? (
                      <ul className="divide-y divide-slate-100">
                        {lowStockProducts.slice(0, 6).map((product) => (
                          <li key={product.id} className="flex items-center justify-between gap-4 py-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-800">{product.name}</div>
                              <div className="mt-0.5 truncate text-xs text-slate-500">SKU {product.sku}</div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${Number(product.stock) === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{product.stock} uds.</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rounded-2xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">Todo el inventario tiene existencias suficientes.</div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          <section id="products" aria-labelledby="products-heading" className="mt-7 scroll-mt-6">
            <h2 id="products-heading" className="sr-only">Gestión de productos</h2>
            <React.Suspense fallback={<div aria-live="polite" className="rounded-3xl bg-white p-6 text-sm text-slate-500 shadow-sm">Cargando gestión de productos…</div>}>
              <ProductTableLazy onChanged={loadDashboard} />
            </React.Suspense>
          </section>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ label, value, detail, warning = false }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-500">{label}</div>
        <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${warning ? 'bg-amber-500' : 'bg-[#D4AF37]'}`} />
      </div>
      <div className={`mt-3 text-3xl font-black tracking-tight ${warning ? 'text-amber-700' : 'text-slate-950'}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </article>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-live="polite" aria-busy="true" className="mt-7 space-y-5">
      <span className="sr-only">Cargando panel</span>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-3xl bg-white" />)}
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-white" />
    </div>
  )
}
