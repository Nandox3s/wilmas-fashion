import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import {
  getOrder,
  getOrderInvoice,
  getOrderInvoicePdf,
  getOrderInvoiceXml,
  getOrderShipment,
  adminCreateShipment,
  adminPatchShipment,
  adminMarkShipped,
  adminMarkDelivered,
  adminAddShipmentEvent,
} from '../services/orderService'
import { authConfig } from '../services/apiClient'
import { formatCurrency } from '../utils/cart'

function sanitizeError(err) {
  return err?.response?.data?.error || err?.message || 'Error inesperado'
}

function Section({ title, children }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-base font-bold text-slate-800">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <p className="text-sm text-slate-600">
      <span className="font-semibold text-slate-800">{label}:</span> {value ?? '—'}
    </p>
  )
}

export default function AdminOrderDetail() {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  const [shipForm, setShipForm] = useState({ carrierName: '', trackingNumber: '', trackingUrl: '', estimatedDelivery: '' })

  async function load() {
    try {
      const o = await getOrder(orderId)
      setOrder(o)
      const [inv, ship] = await Promise.allSettled([getOrderInvoice(o.id), getOrderShipment(o.id)])
      if (inv.status === 'fulfilled') setInvoice(inv.value)
      if (ship.status === 'fulfilled') setShipment(ship.value)
    } catch (err) {
      setError(sanitizeError(err))
    }
  }

  useEffect(() => { load() }, [orderId])

  async function retryInvoice() {
    setBusy('retry'); setActionError('')
    try {
      await axios.post(`/api/admin/invoices/${invoice.id}/retry`, {}, authConfig())
      await load()
    } catch (err) { setActionError(sanitizeError(err)) } finally { setBusy('') }
  }

  async function downloadDocument(type) {
    try {
      const blob = type === 'xml' ? await getOrderInvoiceXml(order.id) : await getOrderInvoicePdf(order.id)
      const ext = type === 'xml' ? 'xml' : 'pdf'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `WilmasFashion-${order.reference}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) { setActionError(sanitizeError(err)) }
  }

  async function registerShipment(e) {
    e.preventDefault(); setBusy('shipment'); setActionError('')
    try {
      const created = await adminCreateShipment(order.id, shipForm)
      setShipment(created)
    } catch (err) { setActionError(sanitizeError(err)) } finally { setBusy('') }
  }

  async function markShipped() {
    if (!shipment) return
    setBusy('shipped'); setActionError('')
    try { const s = await adminMarkShipped(shipment.id); setShipment(s); await load() }
    catch (err) { setActionError(sanitizeError(err)) } finally { setBusy('') }
  }

  async function markDelivered() {
    if (!shipment) return
    setBusy('delivered'); setActionError('')
    try { const s = await adminMarkDelivered(shipment.id); setShipment(s); await load() }
    catch (err) { setActionError(sanitizeError(err)) } finally { setBusy('') }
  }

  if (error) return <main className="p-10" role="alert">{error}</main>
  if (!order) return <main className="p-10">Cargando…</main>

  return (
    <main className="min-h-[70vh] bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#5B0E2D]">Admin · Pedido</p>
        <h1 className="mt-2 font-serif text-3xl text-slate-900">{order.reference}</h1>
        <p className="mt-1 text-sm text-slate-500">Estado: <strong>{order.status}</strong></p>

        {actionError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <Section title="Artículos">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between border-b py-2 text-sm">
              <span>{item.name} · {item.size} · ×{item.quantity}</span>
              <strong>{formatCurrency(item.total)}</strong>
            </div>
          ))}
          <p className="mt-3 text-right font-bold">Total {formatCurrency(order.total)}</p>
        </Section>

        <Section title="Factura">
          {invoice ? (
            <>
              <Field label="Estado" value={invoice.status} />
              <Field label="Proveedor" value={invoice.provider} />
              <Field label="Número de autorización" value={invoice.authorizationNumber} />
              {invoice.status === 'AUTHORIZED' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100" onClick={() => downloadDocument('pdf')}>Descargar PDF</button>
                  <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100" onClick={() => downloadDocument('xml')}>Descargar XML</button>
                </div>
              )}
              {['PENDING', 'ERROR', 'FAILED'].includes(invoice.status) && (
                <button disabled={busy === 'retry'} onClick={retryInvoice} className="mt-3 rounded-xl bg-[#5B0E2D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {busy === 'retry' ? 'Reintentando…' : 'Reintentar factura'}
                </button>
              )}
            </>
          ) : <p className="text-sm text-slate-500">Sin factura registrada.</p>}
        </Section>

        <Section title="Envío">
          {shipment ? (
            <>
              <Field label="Estado" value={shipment.status} />
              <Field label="Transportista" value={shipment.carrierName} />
              <Field label="Guía" value={shipment.trackingNumber} />
              {shipment.trackingUrl && (
                <p className="text-sm"><a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Ver seguimiento</a></p>
              )}
              <Field label="Entrega estimada" value={shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString() : null} />
              <div className="mt-3 flex flex-wrap gap-2">
                {!['SHIPPED', 'DELIVERED'].includes(shipment.status) && (
                  <button disabled={busy === 'shipped'} onClick={markShipped} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {busy === 'shipped' ? 'Procesando…' : 'Marcar enviado'}
                  </button>
                )}
                {shipment.status !== 'DELIVERED' && (
                  <button disabled={busy === 'delivered'} onClick={markDelivered} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {busy === 'delivered' ? 'Procesando…' : 'Marcar entregado'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={registerShipment} className="grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Transportista" value={shipForm.carrierName} onChange={(e) => setShipForm((f) => ({ ...f, carrierName: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Número de guía" value={shipForm.trackingNumber} onChange={(e) => setShipForm((f) => ({ ...f, trackingNumber: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="URL de seguimiento (https://…)" value={shipForm.trackingUrl} onChange={(e) => setShipForm((f) => ({ ...f, trackingUrl: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
                <input type="date" placeholder="Entrega estimada" value={shipForm.estimatedDelivery} onChange={(e) => setShipForm((f) => ({ ...f, estimatedDelivery: e.target.value }))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={busy === 'shipment'} className="self-start rounded-xl bg-[#5B0E2D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy === 'shipment' ? 'Registrando…' : 'Registrar envío'}
              </button>
            </form>
          )}
        </Section>
      </div>
    </main>
  )
}
