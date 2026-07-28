import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMyOrders } from '../services/orderService'
import { formatCurrency } from '../utils/cart'

export default function MyOrders() {
  const [state, setState] = useState({ loading: true, orders: [], error: '' })
  useEffect(() => { getMyOrders().then((orders) => setState({ loading: false, orders, error: '' })).catch((error) => setState({ loading: false, orders: [], error: error.response?.data?.error || 'No pudimos cargar tus pedidos.' })) }, [])
  return <main className="min-h-[70vh] bg-[#f8f3ef] px-4 py-12"><section className="mx-auto max-w-5xl"><p className="eyebrow">Tu cuenta</p><h1 className="mt-3 font-serif text-4xl text-[#28161e]">Mis pedidos</h1>{state.loading && <p className="mt-8">Cargando…</p>}{state.error && <p className="mt-8 rounded-2xl bg-red-50 p-4 text-red-800" role="alert">{state.error}</p>}<div className="mt-8 grid gap-4">{state.orders.map((order) => <Link key={order.id} to={`/orders/${order.reference}`} className="rounded-2xl border border-[#39232c]/10 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><strong>{order.reference}</strong><span className="rounded-full bg-[#f4e8ed] px-3 py-1 text-xs font-bold text-[#6d1738]">{order.status}</span></div><p className="mt-3 text-sm text-[#705d65]">{new Date(order.createdAt).toLocaleString()} · {order.items.length} línea(s) · {formatCurrency(order.total)}</p></Link>)}</div></section></main>
}
