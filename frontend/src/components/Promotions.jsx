import React from 'react'
import { Link } from 'react-router-dom'
import { availableProducts, getProductImageUrl } from '../data/products'
import { formatCurrency } from '../utils/cart'

export default function Promotions() {
  const offerProduct = availableProducts.find((product) => product.onOffer) || availableProducts[0]

  return (
    <section className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]" aria-label="Promociones y beneficios">
      <article className="relative min-h-[410px] overflow-hidden rounded-[2rem] bg-[#ddd0c7]">
        <img
          src={getProductImageUrl(offerProduct)}
          alt={`${offerProduct.name} en oferta`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(event) => { event.currentTarget.src = '/img_wf/placeholder.svg' }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,10,16,.9),rgba(25,10,16,.45)_55%,transparent)]" />
        <div className="relative flex min-h-[410px] max-w-md flex-col justify-end p-6 text-white sm:p-9">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f0d381]">Oferta destacada</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold">{offerProduct.name}</h2>
          <p className="mt-3 leading-7 text-white/70">{offerProduct.color} · {offerProduct.brand} · {offerProduct.stock} unidades disponibles.</p>
          <p className="mt-5 font-serif text-3xl font-semibold text-[#f0d381]">{formatCurrency(offerProduct.price)}</p>
          <Link to={`/product/${offerProduct.id}`} className="button-primary mt-6 w-fit">Ver esta oferta</Link>
        </div>
      </article>

      <article className="relative overflow-hidden rounded-[2rem] bg-[#6d1738] p-6 text-white sm:p-9">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10 shadow-[0_0_0_42px_rgba(255,255,255,.025)]" />
        <div className="relative flex h-full min-h-[340px] flex-col">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#d4af37] text-[#24131b]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>
          </span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-[#f0d381]">Compra con claridad</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight">Cada variante cuenta.</h2>
          <p className="mt-4 max-w-md leading-7 text-white/70">Elige color, talla y cantidad; el carrito mantiene cada combinación separada y respeta el stock disponible.</p>
          <Link to="/catalog" className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/20 px-5 text-sm font-bold transition hover:bg-white/10">Descubrir la colección <span aria-hidden="true">→</span></Link>
        </div>
      </article>
    </section>
  )
}
