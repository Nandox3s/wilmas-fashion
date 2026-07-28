// SOLO DESARROLLO/PRUEBAS — no disponible en producción
// Montado condicionalmente en App.jsx solo cuando MODE !== 'production'
import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

function isSafePaymentId(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 && n < 2_000_000_000
}

export default function MockPayphoneCheckout() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const rawId = params.get('paymentId') || ''
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isSafePaymentId(rawId)) {
    return (
      <main className="min-h-[60vh] p-6">
        <div className="mx-auto max-w-xl rounded bg-white p-6 shadow">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Entorno de prueba</p>
          <h1 className="mt-2 text-xl font-semibold">PayPhone (Mock)</h1>
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            paymentId inválido o ausente.
          </p>
        </div>
      </main>
    )
  }

  const paymentId = Number(rawId)

  async function doAction(action) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // Step 1: call mock provider confirm endpoint
      const confirmRes = await fetch('/mock-payphone/button/V2/Confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paymentId, currency: 'USD', action }),
      })
      if (!confirmRes.ok) {
        const body = await confirmRes.json().catch(() => ({}))
        throw new Error(body?.error || `Provider confirm failed (${confirmRes.status})`)
      }
      const payload = await confirmRes.json()

      // Step 2: post webhook to backend to simulate provider callback
      const webhookRes = await fetch('/api/webhooks/payphone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payload.transactionId,
          clientTransactionId: payload.clientTransactionId,
        }),
      })
      if (!webhookRes.ok) {
        const body = await webhookRes.json().catch(() => ({}))
        throw new Error(body?.error || `Webhook failed (${webhookRes.status})`)
      }

      // Redirect to payment result page with status info
      const status = action === 'approve' ? 'approved' : action === 'decline' ? 'rejected' : 'cancelled'
      navigate(`/payment-result?status=${status}&paymentId=${paymentId}`)
    } catch (err) {
      setError(err?.message || 'Error inesperado')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[60vh] p-6">
      <div className="mx-auto max-w-xl rounded bg-white p-6 shadow">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Entorno de prueba</p>
        <h1 className="mt-2 text-xl font-semibold">PayPhone (Mock)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Esta pantalla simula el flujo de pago. No es una transacción real.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          ID de transacción: <strong>{String(paymentId)}</strong>
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => doAction('approve')}
            className="rounded-xl bg-[#5B0E2D] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Procesando…' : 'Aprobar pago'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => doAction('decline')}
            className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => doAction('cancel')}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  )
}
