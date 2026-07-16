import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getProductImageUrl } from '../data/products'
import { formatCurrency } from '../utils/cart'
import { getColorSwatch } from './ColorSelector'

export default function ProductCard({ family, onQuickAdd }) {
  const product = family.product
  const priceLabel = family.minPrice === family.maxPrice
    ? formatCurrency(family.minPrice)
    : `Desde ${formatCurrency(family.minPrice)}`

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#34222a]/10 bg-[#fffdf9] shadow-[0_12px_40px_rgba(49,24,34,0.07)]"
    >
      <Link to={`/product/${product.id}`} className="relative block overflow-hidden bg-[#eee5df]">
        <img
          src={getProductImageUrl(product)}
          alt={`${product.name} de ${product.brand}, color ${product.color}`}
          className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          loading="lazy"
          onError={(event) => { event.currentTarget.src = '/img_wf/placeholder.svg' }}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {family.onOffer && (
            <span className="rounded-full bg-[#6d1738] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
              Oferta
            </span>
          )}
          {family.stock > 0 && family.stock <= 6 && (
            <span className="rounded-full bg-[#fff8ed] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7b4b10] shadow-sm">
              Últimas unidades
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a747d]">{product.brand}</p>
        <Link to={`/product/${product.id}`} className="mt-2 font-serif text-xl font-semibold leading-tight text-[#28161e] hover:text-[#6d1738]">
          {product.name}
        </Link>
        <p className="mt-2 text-sm text-[#705d65]">{family.variants.length} {family.variants.length === 1 ? 'color disponible' : 'colores disponibles'}</p>

        <div className="mt-3 flex items-center gap-1.5" aria-label="Colores disponibles">
          {family.variants.slice(0, 5).map((variant) => (
            <span
              key={variant.id}
              title={variant.color}
              className="h-3.5 w-3.5 rounded-full border border-black/15 ring-2 ring-white"
              style={{ backgroundColor: getColorSwatch(variant.color) }}
              aria-label={variant.color}
            />
          ))}
          {family.variants.length > 5 && <span className="ml-1 text-xs text-[#806e75]">+{family.variants.length - 5}</span>}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <div>
            <p className="text-lg font-extrabold text-[#4f102b]">{priceLabel}</p>
            <p className="text-xs text-[#806e75]">Stock: {family.stock}</p>
          </div>
          <button
            type="button"
            onClick={() => onQuickAdd(family)}
            disabled={family.stock <= 0}
            aria-label={`Elegir opciones de ${product.name}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#25131b] text-white shadow-sm transition hover:bg-[#6d1738] active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h2l1.4 8.1a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 2-1.6L20 9H7M12 9v5m-2.5-2.5h5" />
            </svg>
          </button>
        </div>
      </div>
    </motion.article>
  )
}
