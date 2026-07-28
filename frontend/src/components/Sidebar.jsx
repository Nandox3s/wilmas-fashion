import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

const navClass = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] ${isActive ? 'bg-white text-[#5B0E2D] shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white'}`

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const role = localStorage.getItem('role') || 'USER'

  useEffect(() => setOpen(false), [location.pathname, location.hash])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
    localStorage.removeItem('wf_user')
    navigate('/login')
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="font-bold tracking-tight text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D]">
          Wilmas <span className="text-[#5B0E2D]">Panel</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-controls="dashboard-sidebar"
          aria-expanded={open}
          aria-label="Abrir menú del panel"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D]"
        >
          Menú
        </button>
      </header>

      {open && <button type="button" aria-label="Cerrar menú del panel" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] md:hidden" />}

      <aside
        id="dashboard-sidebar"
        aria-label="Navegación del panel"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#111111] px-4 py-5 text-white shadow-2xl transition-all duration-200 md:visible md:pointer-events-auto md:translate-x-0 ${open ? 'visible translate-x-0 pointer-events-auto' : 'invisible -translate-x-full pointer-events-none'}`}
      >
        <div className="flex items-start justify-between gap-3 px-2">
          <Link to="/dashboard" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
            <div className="text-2xl font-black tracking-tight">Wilmas</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#D4AF37]">Panel de control</div>
          </Link>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar menú" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] md:hidden">
            Cerrar
          </button>
        </div>

        <nav className="mt-9 space-y-2" aria-label="Secciones del panel">
          <NavLink end to="/dashboard" className={navClass}>
            <span aria-hidden="true">▦</span>
            Resumen
          </NavLink>
          <a href="#products" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
            <span aria-hidden="true">◇</span>
            Productos
          </a>
          {role === 'ADMIN' && (
            <NavLink to="/admin" className={navClass}>
              <span aria-hidden="true">◎</span>
              Administración
            </NavLink>
          )}
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
            <span aria-hidden="true">↗</span>
            Ver tienda
          </Link>
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-white/45">Sesión</p>
          <p className="mt-1 px-1 text-sm font-semibold text-white">{role === 'ADMIN' ? 'Jefe o Administrador' : 'Usuario'}</p>
          <button onClick={logout} className="mt-3 w-full rounded-xl border border-white/15 px-3 py-2.5 text-left text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]">
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
