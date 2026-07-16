import React from 'react'
import { Link } from 'react-router-dom'
import { availableProducts, getProductImageUrl } from '../data/products'
import { formatCurrency } from '../utils/cart'

export default function Hero() {
  const palazo = availableProducts.find((product) => product.id === 'Palazo_Mujer') || availableProducts[0]

  return (
    <section className="relative overflow-hidden bg-[#24131b] text-white">
      <div className="absolute inset-0 [background:radial-gradient(circle_at_12%_15%,rgba(155,54,90,.38),transparent_32%),radial-gradient(circle_at_88%_4%,rgba(212,175,55,.2),transparent_25%)]" />
      <div className="relative mx-auto grid min-h-[650px] max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#e8c978]">
            Colección 2026 · Wilmas Fashion
          </p>
          <h1 className="mt-5 font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-7xl lg:text-[5.5rem]">
            Tu estilo, sin pedir permiso.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-white/70 sm:text-lg">
            Una selección de siluetas cómodas y colores versátiles para vestir cada día con intención.
          </p>
          <div className="mt-8 flex flex-col gap-3 min-[380px]:flex-row">
            <Link to="/catalog" className="button-primary">Comprar ahora <span aria-hidden="true">→</span></Link>
            <Link to="/category/Mujer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10">Explorar mujer</Link>
          </div>

          <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/[0.12] pt-6 text-sm">
            <div><dt className="font-serif text-2xl text-[#f0d381]">17+</dt><dd className="mt-1 text-xs text-white/55">variantes</dd></div>
            <div><dt className="font-serif text-2xl text-[#f0d381]">320 px</dt><dd className="mt-1 text-xs text-white/55">experiencia móvil</dd></div>
            <div><dt className="font-serif text-2xl text-[#f0d381]">Siempre</dt><dd className="mt-1 text-xs text-white/55">a tu ritmo</dd></div>
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-2 shadow-[0_35px_100px_rgba(0,0,0,.35)] backdrop-blur-sm sm:rounded-[2.5rem]">
            <img
              src={getProductImageUrl(palazo)}
              alt={`${palazo.name}, color ${palazo.color}`}
              className="aspect-[4/5] max-h-[670px] w-full rounded-[1.55rem] object-cover sm:rounded-[2rem]"
              onError={(event) => { event.currentTarget.src = '/img_wf/placeholder.svg' }}
            />
          </div>
          <div className="absolute -bottom-5 left-3 right-3 rounded-[1.25rem] border border-white/10 bg-[#fffdf9]/95 p-4 text-[#28161e] shadow-[0_20px_50px_rgba(0,0,0,.2)] backdrop-blur sm:bottom-5 sm:left-[-1.5rem] sm:right-auto sm:w-72">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#806e75]">Pieza destacada</p>
                <p className="mt-1 truncate font-serif text-xl font-semibold">{palazo.name}</p>
                <p className="mt-1 text-sm font-extrabold text-[#6d1738]">{formatCurrency(palazo.price)}</p>
              </div>
              <Link to={`/product/${palazo.id}`} aria-label={`Ver ${palazo.name}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#6d1738] text-white transition hover:bg-[#8a1d49]">
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
