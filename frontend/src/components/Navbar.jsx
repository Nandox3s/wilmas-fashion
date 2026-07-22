import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

const navigation = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/catalog', label: 'Catálogo' },
  { to: '/category/Hombre', label: 'Hombre' },
  { to: '/category/Mujer', label: 'Mujer' },
  { to: '/category/Ofertas', label: 'Ofertas' },
]

function getStoredUser() {
  if (typeof window === 'undefined') return null

  try {
    return JSON.parse(window.localStorage.getItem('wf_user') || 'null')
  } catch {
    return null
  }
}

function DesktopNavLink({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => (
        `relative rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-vino/10 text-vino'
            : 'text-slate-700 hover:bg-white hover:text-vino'
        }`
      )}
    >
      {label}
    </NavLink>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const menuButtonRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const cart = useCart() || {}
  const items = Array.isArray(cart.items) ? cart.items : []
  const hasItemCount = cart.itemCount !== undefined && cart.itemCount !== null && Number.isFinite(Number(cart.itemCount))
  const count = hasItemCount
    ? Math.max(0, Number(cart.itemCount))
    : items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity ?? item.qty ?? 0) || 0), 0)
  const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null
  const user = getStoredUser()
  const firstName = user?.name?.trim()?.split(/\s+/)[0]

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  function logout() {
    window.localStorage.removeItem('token')
    window.localStorage.removeItem('role')
    window.localStorage.removeItem('wf_user')
    window.localStorage.removeItem('user')
    setMenuOpen(false)
    navigate('/login', { replace: true })
  }

  function submitSearch(event) {
    event.preventDefault()
    const search = query.trim()
    if (!search) return

    setMenuOpen(false)
    navigate(`/catalog?q=${encodeURIComponent(search)}`)
  }

  const mobileLinkClass = ({ isActive }) => (
    `flex min-h-12 items-center justify-between rounded-2xl px-4 py-3 text-base font-semibold transition-colors ${
      isActive
        ? 'bg-vino text-white shadow-sm'
        : 'text-slate-800 hover:bg-vino/5 hover:text-vino'
    }`
  )

  return (
    <header className="sticky top-0 z-50 border-b border-vino/10 bg-[#fffaf5]/95 shadow-[0_10px_30px_rgba(39,16,24,0.06)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-7">
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 rounded-xl" aria-label="Wilmas Fashion, ir al inicio">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-vino text-lg font-black text-white shadow-[0_8px_24px_rgba(91,14,45,0.22)] transition-transform group-hover:-translate-y-0.5" aria-hidden="true">
              W
            </span>
            <span className="min-w-0 leading-none">
              <span className="block text-base font-extrabold tracking-[-0.03em] text-matte sm:text-lg">Wilmas</span>
              <span className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.3em] text-vino min-[360px]:block">Fashion</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {navigation.map((item) => <DesktopNavLink key={item.to} {...item} />)}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <form onSubmit={submitSearch} role="search" className="relative hidden xl:block">
            <label htmlFor="desktop-product-search" className="sr-only">Buscar productos</label>
            <input
              id="desktop-product-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar productos"
              autoComplete="off"
              className="h-11 w-52 rounded-full border border-vino/10 bg-white/80 py-2 pl-4 pr-11 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-500 hover:border-vino/25 focus:border-vino focus:outline-none"
            />
            <button type="submit" className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full text-vino transition hover:bg-vino/10" aria-label="Buscar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <Link
            to="/cart"
            className="relative grid h-11 w-11 place-items-center rounded-full border border-vino/10 bg-white/80 text-matte shadow-sm transition hover:-translate-y-0.5 hover:border-vino/25 hover:text-vino hover:shadow-md"
            aria-label={`Carrito, ${count} ${count === 1 ? 'artículo' : 'artículos'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[22px] w-[22px]" aria-hidden="true">
              <path d="M3.5 5h2l1.7 9.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L20.5 8H7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9.5" cy="19" r="1.25" />
              <circle cx="17" cy="19" r="1.25" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-[#fffaf5] bg-gold px-1 text-[10px] font-black leading-none text-matte" aria-hidden="true">
                {count > 99 ? '99+' : count}
              </span>
            )}
          </Link>

          {token ? (
            <button type="button" onClick={logout} className="hidden min-h-11 rounded-full border border-vino/15 bg-white px-4 text-sm font-bold text-vino transition hover:bg-vino hover:text-white lg:inline-flex lg:items-center">
              Salir
            </button>
          ) : (
            <Link to="/login" className="hidden min-h-11 items-center rounded-full bg-vino px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(91,14,45,0.18)] transition hover:-translate-y-0.5 hover:bg-[#74143a] hover:shadow-md lg:inline-flex">
              Iniciar sesión
            </Link>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            className="grid h-11 w-11 place-items-center rounded-full border border-vino/10 bg-white/80 text-vino shadow-sm transition hover:bg-vino/5 lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-navigation" className="border-t border-vino/10 bg-[#fffaf5] px-4 pb-5 pt-4 shadow-[0_18px_30px_rgba(39,16,24,0.08)] sm:px-6 lg:hidden">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={submitSearch} role="search" className="relative mb-4">
              <label htmlFor="mobile-product-search" className="sr-only">Buscar productos</label>
              <input
                id="mobile-product-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="¿Qué estás buscando?"
                autoComplete="off"
                className="h-12 w-full rounded-2xl border border-vino/15 bg-white py-3 pl-4 pr-12 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-vino focus:outline-none"
              />
              <button type="submit" className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-xl bg-vino text-white" aria-label="Buscar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                </svg>
              </button>
            </form>

            {token && firstName && (
              <p className="mb-3 px-4 text-sm font-semibold text-slate-600">Hola, {firstName}</p>
            )}

            <nav className="grid gap-1" aria-label="Navegación móvil">
              {navigation.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={mobileLinkClass}>
                  <span>{item.label}</span>
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                    <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </NavLink>
              ))}
              <NavLink to="/products" className={mobileLinkClass}>
                <span>Todos los productos</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 10h12m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </NavLink>
            </nav>

            <div className="mt-4 border-t border-vino/10 pt-4">
              {token ? (
                <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-vino/20 bg-white px-4 font-bold text-vino transition hover:bg-vino hover:text-white">
                  Cerrar sesión
                </button>
              ) : (
                <Link to="/login" className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-vino px-4 font-bold text-white shadow-sm transition hover:bg-[#74143a]">
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
