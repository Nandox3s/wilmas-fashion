import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { formatCurrency, parseSizes } from '../utils/cart'
import ColorSelector from './ColorSelector'
import QuantitySelector from './QuantitySelector'
import SizeSelector from './SizeSelector'

export default function ProductConfigurator({ family, onAdded, onVariantChange }) {
  const variants = useMemo(() => family?.variants || [], [family])
  const { addItem, getLineQuantity } = useCart()
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const availableVariants = variants.filter((variant) => variant.stock > 0)
    setSelectedVariantId(availableVariants.length === 1 ? String(availableVariants[0].id) : '')
    setSelectedSize('')
    setQuantity(1)
    setErrors({})
  }, [family?.key, variants])

  const activeVariant = variants.find((variant) => String(variant.id) === selectedVariantId) || null
  const sizes = useMemo(
    () => parseSizes(activeVariant?.sizes ?? activeVariant?.size),
    [activeVariant]
  )

  useEffect(() => {
    setSelectedSize(sizes.length === 1 ? sizes[0] : '')
    setQuantity(1)
    onVariantChange?.(activeVariant || family?.product || null)
  }, [activeVariant, family?.product, onVariantChange, sizes])

  const lineQuantity = activeVariant
    ? getLineQuantity(activeVariant.id, selectedSize, activeVariant.color)
    : 0
  const remainingStock = activeVariant
    ? Math.max(0, activeVariant.stock - lineQuantity)
    : 0

  useEffect(() => {
    if (remainingStock > 0 && quantity > remainingStock) setQuantity(remainingStock)
  }, [quantity, remainingStock])

  const price = activeVariant?.price ?? family?.minPrice ?? 0
  const discount = activeVariant?.discount || 0
  const effectivePrice = price * (1 - discount / 100)

  function handleAdd() {
    const nextErrors = {}
    if (!activeVariant) nextErrors.color = 'Elige un color para continuar.'
    if (activeVariant && sizes.length > 1 && !selectedSize) {
      nextErrors.size = 'Elige una talla para continuar.'
    }
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) {
      toast.error('Selecciona las opciones del producto')
      return
    }

    if (!activeVariant || remainingStock < 1) {
      toast.error('No queda stock disponible para esta variante')
      return
    }

    addItem(activeVariant, {
      quantity: Math.min(quantity, remainingStock),
      size: selectedSize,
      color: activeVariant.color,
    })
    toast.success(`${activeVariant.name} se agregó al carrito`)
    onAdded?.()
  }

  return (
    <div className="space-y-5">
      <ColorSelector
        options={variants}
        value={selectedVariantId}
        onChange={(value) => {
          setSelectedVariantId(value)
          setErrors((current) => ({ ...current, color: '' }))
        }}
        error={errors.color}
      />

      {activeVariant && (
        <SizeSelector
          sizes={sizes}
          value={selectedSize}
          onChange={(value) => {
            setSelectedSize(value)
            setErrors((current) => ({ ...current, size: '' }))
          }}
          error={errors.size}
        />
      )}

      <div className="flex flex-wrap items-end justify-between gap-4 border-y border-[#35232b]/10 py-4">
        <QuantitySelector
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, remainingStock)}
          disabled={!activeVariant || remainingStock === 0}
        />
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#806e75]">Total</p>
          <p className="mt-1 font-serif text-3xl font-semibold text-[#4f102b]">
            {formatCurrency(effectivePrice * quantity)}
          </p>
          {discount > 0 && (
            <p className="text-xs text-[#806e75]">Incluye {discount}% de descuento</p>
          )}
        </div>
      </div>

      {activeVariant && (
        <p className={`text-sm ${remainingStock <= 3 ? 'font-semibold text-[#a52a47]' : 'text-[#6e5b63]'}`}>
          {remainingStock > 0
            ? `${remainingStock} ${remainingStock === 1 ? 'unidad disponible' : 'unidades disponibles'}${lineQuantity ? ` · ${lineQuantity} en tu carrito` : ''}`
            : 'Ya tienes todo el stock disponible en el carrito.'}
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={Boolean(activeVariant && remainingStock === 0)}
        className="button-primary w-full"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h2l1.4 8.1a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 2-1.6L20 9H7M10 20h.01M17 20h.01" />
        </svg>
        Agregar al carrito
      </button>
    </div>
  )
}
