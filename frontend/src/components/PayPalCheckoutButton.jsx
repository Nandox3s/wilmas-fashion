import { useEffect, useRef, useState } from 'react'
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js'

const clientId = String(import.meta.env.VITE_PAYPAL_CLIENT_ID || '').trim()

function PayPalButtonState({ disabled, createLocalOrder, captureOrder, onCancel, onError }) {
  const [{ isPending, isResolved, isRejected }] = usePayPalScriptReducer()
  const [timedOut, setTimedOut] = useState(false)
  const reportedFailure = useRef(false)

  useEffect(() => {
    if (!isPending) {
      setTimedOut(false)
      return undefined
    }
    const timeout = window.setTimeout(() => setTimedOut(true), 20_000)
    return () => window.clearTimeout(timeout)
  }, [isPending])

  useEffect(() => {
    if (!isRejected || reportedFailure.current) return
    reportedFailure.current = true
    console.error('PayPal SDK initialization failed')
    onError()
  }, [isRejected, onError])

  if (isRejected || timedOut) {
    return (
      <div className="rounded-xl bg-white/10 px-3 py-3 text-center text-xs text-white/75" role="alert">
        <p>No fue posible conectar con PayPal.</p>
        <button type="button" className="mt-2 font-bold text-[#f0d381] underline" onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    )
  }

  if (isPending || !isResolved) {
    return <p className="rounded-xl bg-white/10 px-3 py-3 text-center text-xs text-white/70" aria-live="polite">Conectando de forma segura con PayPal…</p>
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-55' : ''} aria-busy={disabled}>
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal', height: 48, tagline: false }}
        disabled={disabled}
        createOrder={async () => {
          const result = await createLocalOrder()
          if (!result?.paypalOrderId) throw new Error('PAYPAL_ORDER_NOT_CREATED')
          return result.paypalOrderId
        }}
        onApprove={async (data) => captureOrder(data.orderID)}
        onCancel={onCancel}
        onError={() => onError()}
      />
    </div>
  )
}

export default function PayPalCheckoutButton(props) {
  if (!clientId) {
    return <p className="rounded-xl bg-white/10 px-3 py-3 text-center text-xs text-white/70">PayPal aún no está configurado.</p>
  }
  return (
    <PayPalScriptProvider options={{ clientId, currency: 'USD', intent: 'capture', components: 'buttons' }}>
      <PayPalButtonState {...props} />
    </PayPalScriptProvider>
  )
}
