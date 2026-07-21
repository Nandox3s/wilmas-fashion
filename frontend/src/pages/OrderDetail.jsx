import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvoiceDocument, getInvoiceForOrder, getOrder } from '../services/orderService'
import { formatCurrency } from '../utils/cart'

export default function OrderDetail() {
  const { reference } = useParams(); const [order, setOrder] = useState(null); const [invoice, setInvoice] = useState(null); const [error, setError] = useState('')
  useEffect(() => { getOrder(reference).then((data) => { setOrder(data); return getInvoiceForOrder(reference) }).then(setInvoice).catch((err) => { if (err.response?.status !== 404) setError(err.response?.data?.error || 'No pudimos cargar el pedido.') }) }, [reference])
  async function openDocument(type) { const result = await getInvoiceDocument(invoice.id, type); window.open(result.url, '_blank', 'noopener,noreferrer') }
  if (error) return <main className="p-10" role="alert">{error}</main>; if (!order) return <main className="p-10">Cargando…</main>
  return <main className="min-h-[70vh] bg-[#f8f3ef] px-4 py-12"><section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-6 shadow-sm"><p className="eyebrow">Pedido</p><h1 className="mt-3 font-serif text-4xl">{order.reference}</h1><p className="mt-3 text-[#705d65]">Estado: {order.status}</p><div className="mt-7 space-y-3">{order.items.map((item) => <div key={item.id} className="flex justify-between border-b pb-3"><span>{item.name} · {item.size} · {item.quantity}</span><strong>{formatCurrency(item.total)}</strong></div>)}</div><p className="mt-6 text-right text-xl font-bold">Total {formatCurrency(order.total)}</p>{invoice && <div className="mt-8 rounded-2xl bg-[#f8f2ee] p-4"><strong>Factura: {invoice.status}</strong>{invoice.status === 'AUTHORIZED' && <div className="mt-3 flex gap-3"><button className="button-secondary" onClick={() => openDocument('xml')}>XML</button><button className="button-secondary" onClick={() => openDocument('ride')}>RIDE {invoice.provider === 'mock' ? 'demo' : ''}</button></div>}</div>}</section></main>
}
