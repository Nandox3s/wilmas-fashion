import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import CartItem from '../components/CartItem'
import CartSummary from '../components/CartSummary'
import ConfirmModal from '../components/ConfirmModal'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/cart'

export default function Cart() {
  const { items, itemCount, pricing, updateQuantity, removeItem, clearCart } = useCart()
  const [showClearConfirmation, setShowClearConfirmation] = useState(false)

  function handleRemove(lineId) {
    removeItem(lineId)
    toast.success('Producto eliminado del carrito')
  }

  function handleClear() {
    clearCart()
    setShowClearConfirmation(false)
    toast.success('El carrito quedó vacío')
  }

  if (!items.length) {
    return (
      <main className="min-h-[72vh] bg-[#f8f3ef] px-4 py-14 sm:py-20">
        <section className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#39232c]/10 bg-white text-center shadow-[0_24px_70px_rgba(49,24,34,0.08)]">
          <div className="bg-[#24131b] px-6 py-12 text-white sm:py-16">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/[0.08] text-[#e8c978]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h2l1.4 8.1a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 2-1.6L20 9H7M10 20h.01M17 20h.01"/></svg>
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[#e8c978]">Tu selección</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold sm:text-5xl">Tu carrito espera una historia</h1>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-white/70">Descubre prendas pensadas para combinar contigo y guarda tus favoritas aquí.</p>
          </div>
          <div className="px-5 py-7 sm:py-9">
            <Link to="/catalog" className="button-primary">Explorar la colección</Link>
          </div>
        </section>
      </main>
    )
  }

  const freeShippingRemaining = Math.max(0, 80 - pricing.subtotal)
  const freeShippingProgress = Math.min(100, (pricing.subtotal / 80) * 100)

  return (
    <main className="min-h-screen bg-[#f8f3ef] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Tu selección</p>
            <h1 className="mt-3 font-serif text-4xl font-semibold text-[#28161e] sm:text-6xl">Carrito</h1>
            <p className="mt-3 text-sm text-[#705d65]">{itemCount} {itemCount === 1 ? 'artículo listo' : 'artículos listos'} para acompañarte.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/catalog" className="button-secondary">Seguir comprando</Link>
            <button type="button" onClick={() => setShowClearConfirmation(true)} className="button-ghost text-[#9b2948]">Vaciar carrito</button>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">
          <div className="overflow-hidden rounded-[1.5rem] border border-[#39232c]/10 bg-white shadow-[0_16px_50px_rgba(49,24,34,0.06)]">
            <div className="border-b border-[#39232c]/10 bg-[#fffaf6] px-5 py-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-bold text-[#3a222c]">Envío gratis desde {formatCurrency(80)}</span>
                <span className="text-[#806e75]">{freeShippingRemaining ? `Faltan ${formatCurrency(freeShippingRemaining)}` : '¡Lo conseguiste!'}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eadfd8]" aria-hidden="true">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#6d1738,#d4af37)] transition-[width]" style={{ width: `${freeShippingProgress}%` }} />
              </div>
            </div>
            {items.map((item) => (
              <CartItem
                key={item.lineId}
                item={item}
                onQuantityChange={updateQuantity}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <div className="lg:sticky lg:top-28">
            <CartSummary pricing={pricing} ctaTo="/checkout" />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={handleClear}
        title="¿Vaciar todo el carrito?"
        description="Se eliminarán todas las prendas y variantes guardadas. Esta acción no se puede deshacer."
        confirmLabel="Sí, vaciar carrito"
      />
    </main>
  )
}
