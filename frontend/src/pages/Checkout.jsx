import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import CartSummary from '../components/CartSummary'
import CheckoutForm from '../components/CheckoutForm'
import { useCart } from '../context/CartContext'
import ProductImage from '../components/ProductImage'
import PayPalCheckoutButton from '../components/PayPalCheckoutButton'
import { validateCheckout } from '../utils/checkout'
import { formatCurrency } from '../utils/cart'
import { capturePaypalOrder, createOrder, createPaypalOrder } from '../services/orderService'
import { friendlyApiError } from '../services/apiClient'

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  identificationNumber: '',
  billingIdentificationType: 'CEDULA',
  billingIdentificationNumber: '',
  billingName: '',
  billingEmail: '',
  billingPhone: '',
  billingAddress: '',
  billingSameAsShipping: true,
  address: '',
  city: '',
  province: '',
  reference: '',
  deliveryMethod: 'standard',
  paymentMethod: 'cash_on_delivery',
}

function OrderConfirmation({ order }) {
  return (
    <main className="min-h-[75vh] bg-[#f8f3ef] px-4 py-14 sm:py-20">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-[#39232c]/10 bg-white text-center shadow-[0_24px_80px_rgba(49,24,34,0.1)]">
        <div className="bg-[#24131b] px-5 py-12 text-white sm:px-10 sm:py-16">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#d4af37] text-[#24131b] shadow-[0_10px_30px_rgba(212,175,55,.25)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6"/></svg>
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#e8c978]">{order.provider === 'paypal' ? 'Pago confirmado' : 'Pedido confirmado'}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">Tu pedido fue registrado</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/[0.72]">{order.provider === 'paypal' ? 'PayPal confirmó tu pago correctamente.' : 'Paga al momento de recibir tu pedido.'}</p>
        </div>
        <div className="px-5 py-8 sm:px-10">
          <dl className="mx-auto grid max-w-xl gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f2ee] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.15em] text-[#806e75]">Referencia del pedido</dt>
              <dd className="mt-2 font-bold text-[#3b2530]">{order.reference}</dd>
            </div>
            <div className="rounded-2xl bg-[#f8f2ee] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.15em] text-[#806e75]">Total</dt>
              <dd className="mt-2 font-bold text-[#4f102b]">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-6 text-[#705d65]">Puedes consultar el estado y los detalles desde la sección de pedidos.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/catalog" className="button-primary">Seguir explorando</Link>
            <Link to="/" className="button-secondary">Volver al inicio</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

export default function Checkout() {
  const { items, pricing, clearCart } = useCart()
  const [form, setForm] = useState(initialForm)
  const [touched, setTouched] = useState({})
  const [processing, setProcessing] = useState(false)
  const [order, setOrder] = useState(null)
  const paypalOrderRef = useRef(null)

  const deliveryOptions = useMemo(() => [
    {
      id: 'standard',
      name: 'Entrega estándar',
      copy: 'Llegada estimada de 3 a 5 días hábiles.',
      price: pricing.standardShipping,
    },
    {
      id: 'express',
      name: 'Entrega express',
      copy: 'Llegada estimada de 1 a 2 días hábiles.',
      price: 12.9,
    },
  ], [pricing.standardShipping])

  const errors = useMemo(() => validateCheckout(form), [form])
  const isValid = Object.keys(errors).length === 0
  const shipping = deliveryOptions.find((option) => option.id === form.deliveryMethod)?.price ?? pricing.standardShipping

  function updateField(field, value, markTouched = false) {
    setForm((current) => ({ ...current, [field]: value }))
    if (markTouched) setTouched((current) => ({ ...current, [field]: true }))
  }

  function localOrderPayload() {
    return {
      customerName: `${form.firstName} ${form.lastName}`.trim(), customerEmail: form.email,
      identificationType: form.billingIdentificationType,
      identificationNumber: form.billingIdentificationNumber || form.identificationNumber,
      address: form.billingSameAsShipping
        ? `${form.address}${form.reference ? `, ${form.reference}` : ''}`
        : form.billingAddress,
      city: form.city,
      phone: form.billingPhone || form.phone,
      billingProfile: {
        legalName: form.billingName || `${form.firstName} ${form.lastName}`.trim(),
        billingEmail: form.billingEmail || form.email,
        billingAddress: form.billingSameAsShipping
          ? `${form.address}${form.reference ? `, ${form.reference}` : ''}`
          : form.billingAddress,
      },
      paymentMethod: form.paymentMethod,
      items: items.map((item) => ({ productId: item.apiId, quantity: item.quantity, size: item.size, color: item.color })),
    }
  }

  function assertCheckoutReady() {
    if (!isValid) {
      setTouched(Object.keys(initialForm).reduce((result, field) => ({ ...result, [field]: true }), {}))
      throw new Error('Revisa los campos señalados antes de continuar.')
    }
    if (!window.localStorage.getItem('token')) throw new Error('Inicia sesión para pagar con PayPal.')
    if (items.some((item) => !Number.isInteger(Number(item.apiId)))) throw new Error('Algunos productos todavía no pueden reservarse.')
  }

  async function beginPaypalCheckout() {
    try {
      assertCheckoutReady()
      setProcessing(true)
      const created = paypalOrderRef.current?.localOrder || await createOrder(localOrderPayload())
      paypalOrderRef.current = { localOrder: created, paypalOrderId: paypalOrderRef.current?.paypalOrderId || null }
      const paypal = await createPaypalOrder(created.id)
      paypalOrderRef.current = { localOrder: created, paypalOrderId: paypal.paypalOrderId }
      return paypal
    } catch (error) {
      setProcessing(false)
      const message = friendlyApiError(error, 'No pudimos comunicarnos con PayPal. Intenta nuevamente.')
      toast.error(message)
      throw error
    } finally {
      setProcessing(false)
    }
  }

  async function finishPaypalCheckout(paypalOrderId) {
    const pending = paypalOrderRef.current
    if (!pending || pending.paypalOrderId !== paypalOrderId) throw new Error('La orden PayPal no corresponde al pedido local.')
    try {
      setProcessing(true)
      const captured = await capturePaypalOrder(paypalOrderId, pending.localOrder.id)
      if (captured.paypalStatus !== 'COMPLETED' || captured.orderStatus !== 'PAID') throw new Error('PayPal no confirmó el pago.')
      clearCart()
      setOrder({ reference: pending.localOrder.reference, total: pending.localOrder.total, provider: 'paypal', paymentStatus: 'COMPLETED' })
      paypalOrderRef.current = null
      toast.success('Pago confirmado por PayPal')
    } catch (error) {
      toast.error(friendlyApiError(error, 'No se pudo completar el pago.'))
      throw error
    } finally {
      setProcessing(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (processing) return

    if (!isValid) {
      setTouched(Object.keys(initialForm).reduce((result, field) => ({ ...result, [field]: true }), {}))
      toast.error('Revisa los campos señalados antes de continuar')
      return
    }

    if (form.paymentMethod === 'paypal') {
      toast('Usa el botón oficial de PayPal para continuar.')
      return
    }

    setProcessing(true)
    try {
      if (!window.localStorage.getItem('token')) throw new Error('Inicia sesión para confirmar tu pedido.')
      if (items.some((item) => !Number.isInteger(Number(item.apiId)))) throw new Error('Algunos productos todavía no pueden reservarse.')
      const created = await createOrder(localOrderPayload())
      clearCart()
      setOrder({ reference: created.reference, total: created.total, provider: 'cash_on_delivery', paymentStatus: 'PENDING' })
      toast.success('Pedido confirmado. Pagarás al recibirlo.')
    } catch (error) {
      toast.error(friendlyApiError(error, 'No se pudo completar el pedido.'))
    } finally {
      setProcessing(false)
    }
  }

  if (order) return <OrderConfirmation order={order} />

  if (!items.length) {
    return (
      <main className="min-h-[70vh] bg-[#f8f3ef] px-4 py-16 text-center">
        <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#39232c]/10 bg-white px-5 py-14 shadow-sm">
          <p className="eyebrow">Checkout</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-[#28161e]">Primero elige algo que te encante</h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-[#705d65]">Tu carrito está vacío, así que todavía no hay un pedido para revisar.</p>
          <Link to="/catalog" className="button-primary mt-7">Ir al catálogo</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#f8f3ef] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Migas de pan" className="flex items-center gap-2 text-sm text-[#705d65]">
          <Link to="/cart" className="hover:text-[#6d1738]">Carrito</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-[#2a1820]">Checkout</span>
        </nav>
        <div className="mt-5">
          <p className="eyebrow">Último paso</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-[#28161e] sm:text-6xl">Completa tu pedido</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#705d65] sm:text-base">Revisa tus datos y elige cómo deseas pagar.</p>
        </div>

        <form id="checkout-form" onSubmit={handleSubmit} noValidate className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_410px]">
          <CheckoutForm
            form={form}
            errors={errors}
            touched={touched}
            onChange={updateField}
            deliveryOptions={deliveryOptions}
          />

          <div className="lg:sticky lg:top-28">
            <CartSummary
              pricing={pricing}
              shipping={shipping}
              formId="checkout-form"
              ctaLabel="Confirmar pedido"
              disabled={!isValid}
              processing={processing}
              hideCta={form.paymentMethod === 'paypal'}
            >
              <div className="mt-5 max-h-72 space-y-3 overflow-y-auto border-t border-white/[0.12] pt-5 pr-1">
                {items.map((item) => {
                  const effectivePrice = item.price * (1 - item.discount / 100)
                  return (
                    <div key={item.lineId} className="flex gap-3 rounded-xl bg-white/[0.07] p-2.5">
                      <ProductImage
                        product={item}
                        alt=""
                        className="h-16 w-[52px] shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2">
                          <p className="truncate text-sm font-bold text-white">{item.name}</p>
                          <p className="shrink-0 text-xs font-bold text-[#f0d381]">{formatCurrency(effectivePrice * item.quantity)}</p>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-white/60">
                          {item.color}{item.size ? ` · Talla ${item.size}` : ''} · Cant. {item.quantity}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              {!isValid && (
                <p className="mt-4 rounded-xl bg-white/[0.08] px-3 py-2.5 text-xs leading-5 text-white/70" aria-live="polite">
                  Completa correctamente todos los campos para habilitar la confirmación.
                </p>
              )}
              {form.paymentMethod === 'paypal' && (
                <div className="mt-5 border-t border-white/[0.12] pt-5">
                  <PayPalCheckoutButton
                    disabled={!isValid}
                    createLocalOrder={beginPaypalCheckout}
                    captureOrder={finishPaypalCheckout}
                    onCancel={() => { setProcessing(false); toast('Pago PayPal cancelado. Tu pedido no fue marcado como pagado.') }}
                    onError={() => { setProcessing(false); toast.error('No fue posible completar el pago con PayPal.') }}
                  />
                  {processing && <p className="mt-3 text-center text-xs text-white/70">Preparando tu orden segura…</p>}
                </div>
              )}
            </CartSummary>
          </div>
        </form>
      </div>
    </main>
  )
}
