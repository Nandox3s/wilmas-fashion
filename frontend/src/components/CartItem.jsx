import { Link } from 'react-router-dom'
import { getProductImageUrl } from '../data/products'
import { formatCurrency } from '../utils/cart'
import QuantitySelector from './QuantitySelector'

export default function CartItem({ item, onQuantityChange, onRemove }) {
  const effectivePrice = item.price * (1 - item.discount / 100)

  return (
    <article className="grid gap-4 border-b border-[#39232c]/10 p-4 last:border-b-0 sm:grid-cols-[116px_1fr_auto] sm:gap-5 sm:p-5">
      <Link to={`/product/${item.productId}`} className="block overflow-hidden rounded-[1.15rem] bg-[#eee5df]">
        <img
          src={getProductImageUrl(item)}
          alt={`${item.name}, color ${item.color}${item.size ? `, talla ${item.size}` : ''}`}
          className="aspect-[4/5] h-full max-h-44 w-full object-cover sm:max-h-none"
          onError={(event) => { event.currentTarget.src = '/img_wf/placeholder.svg' }}
        />
      </Link>

      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a747d]">{item.brand}</p>
        <Link to={`/product/${item.productId}`} className="mt-1 block font-serif text-xl font-semibold text-[#28161e] hover:text-[#6d1738]">
          {item.name}
        </Link>
        <p className="mt-1 truncate text-xs text-[#806e75]">Ref. {item.sku}</p>

        <dl className="mt-3 flex flex-wrap gap-2 text-sm">
          {item.color && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5edef] px-3 py-1.5">
              <dt className="text-[#806e75]">Color</dt>
              <dd className="font-bold text-[#4b3740]">{item.color}</dd>
            </div>
          )}
          {item.size && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f5edef] px-3 py-1.5">
              <dt className="text-[#806e75]">Talla</dt>
              <dd className="font-bold text-[#4b3740]">{item.size}</dd>
            </div>
          )}
        </dl>

        <div className="mt-4 flex flex-wrap items-end gap-4">
          <QuantitySelector
            value={item.quantity}
            max={item.stock}
            compact
            label="Cantidad"
            onChange={(quantity) => onQuantityChange(item.lineId, quantity)}
          />
          <button
            type="button"
            onClick={() => onRemove(item.lineId)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-[#9b2948] transition hover:bg-[#fff0f3]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>
            Eliminar
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 sm:block sm:min-w-28 sm:text-right">
        <div>
          <p className="text-lg font-extrabold text-[#4f102b]">{formatCurrency(effectivePrice * item.quantity)}</p>
          <p className="mt-1 text-xs text-[#806e75]">{formatCurrency(effectivePrice)} c/u</p>
          {item.discount > 0 && <p className="mt-1 text-xs font-bold text-[#9a6a19]">-{item.discount}% aplicado</p>}
        </div>
        <p className={`mt-0 text-xs sm:mt-5 ${item.stock - item.quantity <= 2 ? 'font-bold text-[#a52a47]' : 'text-[#806e75]'}`}>
          {item.stock - item.quantity > 0 ? `${item.stock - item.quantity} más disponibles` : 'Máximo disponible'}
        </p>
      </div>
    </article>
  )
}
