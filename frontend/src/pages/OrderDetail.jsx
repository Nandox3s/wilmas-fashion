import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder, getOrderInvoice, getOrderInvoicePdf, getOrderInvoiceXml, getOrderShipment, getOrderTracking } from '../services/orderService'
import { formatCurrency } from '../utils/cart'

function sanitizeError(err) {
  return err?.response?.data?.error || err?.message || 'Error inesperado'
}

function isSafeUrl(value) {
  if (!value) return false
  try {
    const url = new URL(String(value))
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function safeDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export default function OrderDetail() {
  const { reference } = useParams()
  const [order, setOrder] = useState(null)
  const [invoice, setInvoice] = useState(null)
  const [shipment, setShipment] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [error, setError] = useState('')
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    getOrder(reference)
      .then(async (data) => {
        setOrder(data)
        const [invoiceResult, shipmentResult, trackingResult] = await Promise.allSettled([
          getOrderInvoice(data.id),
          getOrderShipment(data.id),
          getOrderTracking(data.id),
        ])
        if (invoiceResult.status === 'fulfilled') setInvoice(invoiceResult.value)
        if (shipmentResult.status === 'fulfilled') setShipment(shipmentResult.value)
        if (trackingResult.status === 'fulfilled') setTracking(trackingResult.value)
      })
      .catch((err) => setError(sanitizeError(err)))
  }, [reference])

  async function downloadDocument(type) {
    setDownloadError('')
    try {
      const blob = type === 'xml' ? await getOrderInvoiceXml(order.id) : await getOrderInvoicePdf(order.id)
      const ext = type === 'xml' ? 'xml' : 'pdf'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `WilmasFashion-${order.reference}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(sanitizeError(err))
    }
  }

  if (error) return <main className="p-10" role="alert">{error}</main>
  if (!order) return <main className="p-10">Cargando…</main>

  const events = tracking?.events || shipment?.events || []
  const trackingUrl = tracking?.trackingUrl || shipment?.trackingUrl
  const safeTrackingUrl = isSafeUrl(trackingUrl) ? trackingUrl : null
  const estimatedDelivery = safeDate(shipment?.estimatedDelivery)

  return (
    <main className="min-h-[70vh] bg-[#f8f3ef] px-4 py-12">
      <section className="mx-auto max-w-4xl rounded-[2rem] bg-white p-6 shadow-sm">
        <p className="eyebrow">Pedido</p>
        <h1 className="mt-3 font-serif text-4xl">{order.reference}</h1>
        <p className="mt-3 text-[#705d65]">Estado: <strong>{order.status}</strong></p>

        <div className="mt-7 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between border-b pb-3">
              <span>{item.name} · {item.size} · ×{item.quantity}</span>
              <strong>{formatCurrency(item.total)}</strong>
            </div>
          ))}
        </div>
        <p className="mt-6 text-right text-xl font-bold">Total {formatCurrency(order.total)}</p>

        {downloadError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {downloadError}
          </div>
        )}

        {invoice && (
          <div className="mt-8 rounded-2xl bg-[#f8f2ee] p-4">
            <p className="font-semibold">Factura: {invoice.status}</p>
            {invoice.provider === 'mock' && (
              <p className="mt-1 text-xs font-semibold text-amber-700">
                DOCUMENTO DE PRUEBA · SIN VALIDEZ TRIBUTARIA · NO AUTORIZADO POR EL SRI
              </p>
            )}
            {invoice.status === 'AUTHORIZED' && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#39232c]/20 px-3 py-2 text-sm font-semibold hover:bg-[#f0e8e4]"
                  onClick={() => downloadDocument('xml')}
                >
                  Descargar XML
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#39232c]/20 px-3 py-2 text-sm font-semibold hover:bg-[#f0e8e4]"
                  onClick={() => downloadDocument('pdf')}
                >
                  Descargar PDF
                </button>
              </div>
            )}
          </div>
        )}

        {shipment && (
          <div className="mt-6 rounded-2xl bg-[#f2f7ff] p-4">
            <p className="font-semibold">Envío: {shipment.status}</p>
            <div className="mt-2 grid gap-1 text-sm text-[#4b5b77]">
              {shipment.carrierName && (
                <p>Transportista: <strong>{shipment.carrierName}</strong></p>
              )}
              {shipment.trackingNumber && (
                <p>Número de guía: <strong>{shipment.trackingNumber}</strong></p>
              )}
              {estimatedDelivery && (
                <p>Entrega estimada: <strong>{estimatedDelivery.toLocaleDateString()}</strong></p>
              )}
              {safeTrackingUrl ? (
                <a
                  href={safeTrackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block font-semibold text-[#1f4aa0] underline"
                >
                  Ver seguimiento en línea
                </a>
              ) : trackingUrl ? (
                <p className="mt-2 text-xs text-slate-400">URL de seguimiento no disponible</p>
              ) : null}
            </div>

            {events.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4b5b77]">
                  Historial
                </p>
                <ol className="space-y-2">
                  {events.map((ev, i) => {
                    const evDate = safeDate(ev.occurredAt || ev.createdAt)
                    return (
                      <li key={ev.id ?? i} className="flex gap-3 text-sm">
                        <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#1f4aa0]" aria-hidden="true" />
                        <div>
                          <span className="font-semibold text-slate-800">{ev.status}</span>
                          {ev.description && (
                            <span className="ml-2 text-slate-500">{ev.description}</span>
                          )}
                          {ev.location && (
                            <span className="ml-2 text-slate-400">· {ev.location}</span>
                          )}
                          {evDate && (
                            <span className="ml-2 text-xs text-slate-400">
                              {evDate.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
