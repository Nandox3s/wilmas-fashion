import React from 'react'
import { Link } from 'react-router-dom'

const shopLinks = [
  { to: '/catalog', label: 'Catálogo completo' },
  { to: '/category/Hombre', label: 'Colección hombre' },
  { to: '/category/Mujer', label: 'Colección mujer' },
  { to: '/category/Ofertas', label: 'Ofertas' },
]

export default function Footer() {
  return (
    <footer className="mt-16 overflow-hidden bg-[#170b10] text-white" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">Pie de página</h2>
      <div className="h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.8fr_0.8fr] lg:px-8 lg:py-16">
        <div className="max-w-md">
          <Link to="/" className="inline-flex items-center gap-3 rounded-xl" aria-label="Wilmas Fashion, ir al inicio">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-lg font-black text-matte" aria-hidden="true">W</span>
            <span>
              <span className="block text-xl font-extrabold tracking-[-0.03em]">Wilmas Fashion</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.32em] text-[#e8c964]">Estilo contemporáneo</span>
            </span>
          </Link>
          <p className="mt-5 text-sm leading-7 text-white/70 sm:text-base">
            Prendas elegidas para acompañar tu estilo con una estética limpia, actual y auténtica.
          </p>
          <Link to="/catalog" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-5 text-sm font-bold text-white transition hover:border-gold/60 hover:bg-white/5 hover:text-[#f5d974]">
            Explorar colección
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
              <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-[#e8c964]">Tienda</h3>
          <ul className="mt-5 space-y-3">
            {shopLinks.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="inline-flex min-h-8 items-center text-sm text-white/70 transition hover:translate-x-0.5 hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-[#e8c964]">Contacto</h3>
          <p className="mt-5 text-sm leading-6 text-white/60">¿Necesitas ayuda con una compra o un producto?</p>
          <a href="mailto:hola@wilmas.com" className="mt-4 inline-flex min-h-11 items-center gap-3 rounded-xl text-sm font-semibold text-white/80 transition hover:text-white">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#e8c964]" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                <path d="M4 6.5h16v11H4z" strokeLinejoin="round" />
                <path d="m5 7.5 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            hola@wilmas.com
          </a>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Wilmas Fashion. Todos los derechos reservados.</p>
          <p>Diseñado con atención a cada detalle.</p>
        </div>
      </div>
    </footer>
  )
}
