import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import CartSummary from '../components/CartSummary'
import CheckoutForm from '../components/CheckoutForm'
import { useCart } from '../context/CartContext'
import ProductImage from '../components/ProductImage'
import { validateCheckout } from '../utils/checkout'
import { formatCurrency } from '../utils/cart'
import { confirmPayment, createOrder, createPayment, preparePayphonePayment } from '../services/orderService'

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
  paymentMethod: 'card',
  cardName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
}

function OrderConfirmation({ order }) {
  return (
    <main className="min-h-[75vh] bg-[#f8f3ef] px-4 py-14 sm:py-20">
      <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-[#39232c]/10 bg-white text-center shadow-[0_24px_80px_rgba(49,24,34,0.1)]">
        <div className="bg-[#24131b] px-5 py-12 text-white sm:px-10 sm:py-16">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#d4af37] text-[#24131b] shadow-[0_10px_30px_rgba(212,175,55,.25)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4L19 6"/></svg>
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-[#e8c978]">{order.demo ? 'Demostración completada' : `Pago ${order.paymentStatus}`}</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">Tu experiencia de compra finalizó</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/[0.72]">{order.demo ? 'No se realizó ningún cargo bancario ni se registró un pedido real en el backend.' : 'Se creó un pedido y se procesó exclusivamente con el proveedor mock configurado. No hubo un cobro real.'}</p>
        </div>
        <div className="px-5 py-8 sm:px-10">
          <dl className="mx-auto grid max-w-xl gap-4 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-[#f8f2ee] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.15em] text-[#806e75]">Referencia {order.demo ? 'demo' : 'del pedido'}</dt>
              <dd className="mt-2 font-bold text-[#3b2530]">{order.reference}</dd>
            </div>
            <div className="rounded-2xl bg-[#f8f2ee] p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.15em] text-[#806e75]">Total ilustrativo</dt>
              <dd className="mt-2 font-bold text-[#4f102b]">{formatCurrency(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm leading-6 text-[#705d65]">Los datos de tarjeta se descartaron y nunca se enviaron al backend. El carrito se vació únicamente después de una confirmación aprobada.</p>
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
  const checkoutMode = import.meta.env.VITE_CHECKOUT_MODE || 'demo'

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

  async function handleSubmit(event) {
    event.preventDefault()
    if (processing) return

    if (!isValid) {
      setTouched(Object.keys(initialForm).reduce((result, field) => ({ ...result, [field]: true }), {}))
      toast.error('Revisa los campos señalados antes de continuar')
      return
    }

    setProcessing(true)
    try {
      if (checkoutMode === 'demo') {
        await new Promise((resolve) => window.setTimeout(resolve, 500))
        setOrder({ reference: `WF-DEMO-${Date.now().toString().slice(-7)}`, total: pricing.subtotal + shipping, demo: true })
        clearCart()
        toast.success('Demostración completada correctamente')
      } else {
        if (!window.localStorage.getItem('token')) throw new Error('Inicia sesión para crear un pedido mock o sandbox.')
        if (items.some((item) => !Number.isInteger(Number(item.apiId)))) throw new Error('Algunos productos solo existen en el catálogo local y aún no se pueden reservar.')
        const created = await createOrder({
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
          items: items.map((item) => ({ productId: item.apiId, quantity: item.quantity, size: item.size, color: item.color })),
        })
        if (form.paymentMethod === 'payphone') {
          const payphone = await preparePayphonePayment({ orderId: created.id })
          // If provider returns a redirect URL, send the user there
          if (payphone?.payphone?.redirectUrl) {
            window.location.href = payphone.payphone.redirectUrl
            return
          }
          // Fallback: try to create a generic payment and confirm
          const payment = await createPayment({ orderReference: created.reference, idempotencyKey: `${created.reference}-${crypto.randomUUID()}`, scenario: 'approved' })
          const confirmed = await confirmPayment({ paymentId: payment.id, transactionId: payment.providerTransactionId, scenario: 'approved' })
          if (confirmed.status === 'APPROVED') clearCart()
          setOrder({ reference: created.reference, total: created.total, demo: false, paymentStatus: confirmed.status })
        } else {
          const payment = await createPayment({ orderReference: created.reference, idempotencyKey: `${created.reference}-${crypto.randomUUID()}`, scenario: 'approved' })
          const confirmed = await confirmPayment({ paymentId: payment.id, transactionId: payment.providerTransactionId, scenario: 'approved' })
          if (confirmed.status === 'APPROVED') clearCart()
          setOrder({ reference: created.reference, total: created.total, demo: false, paymentStatus: confirmed.status })
        }
        toast.success(confirmed.status === 'APPROVED' ? 'Pago mock aprobado' : 'El pago no fue aprobado')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'No se pudo completar el flujo.')
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
          <h1 className="mt-3 font-serif text-4xl font-semibold text-[#28161e] sm:text-6xl">Completa tu pedido {checkoutMode}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#705d65] sm:text-base">Modo {checkoutMode}: {checkoutMode === 'demo' ? 'no procesa dinero ni crea una orden en el backend.' : 'crea un pedido y usa el proveedor configurado; los datos de tarjeta nunca se envían a nuestra API.'}</p>
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
              ctaLabel={`Confirmar pedido ${checkoutMode}`}
              disabled={!isValid}
              processing={processing}
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
            </CartSummary>
          </div>
        </form>
      </div>
    </main>
  )
}
