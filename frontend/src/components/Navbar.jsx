import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCart } from '../context/CartContext'

export default function Navbar(){
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const { items } = useCart()
  const count = items.reduce((s,i)=> s + (i.qty||0), 0)
  function logout(){ localStorage.removeItem('token'); localStorage.removeItem('role'); navigate('/login') }

  return (
    <motion.header initial={{y:-20, opacity:0}} animate={{y:0, opacity:1}} className="sticky top-0 z-40 bg-white/60 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-2xl font-bold text-vino">Wilmas<span className="text-matte">Fashion</span></Link>
          <nav className="hidden md:flex gap-4 text-sm text-gray-700">
            <Link to="/" className="hover:text-vino">Inicio</Link>
            <Link to="/category/Hombre" className="hover:text-vino">Hombre</Link>
            <Link to="/category/Mujer" className="hover:text-vino">Mujer</Link>
            <Link to="/category/Accesorios" className="hover:text-vino">Accesorios</Link>
            <Link to="/category/Ofertas" className="hover:text-vino">Ofertas</Link>
            <Link to="/products" className="hover:text-vino">Productos</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <input placeholder="Buscar" className="hidden sm:block border rounded px-3 py-2 w-64" />
          <button className="p-2 rounded hover:bg-gray-100">🔍</button>
          <Link to="/cart" className="p-2 rounded hover:bg-gray-100 relative">
            🛒
            {count>0 && <span className="absolute -top-1 -right-1 bg-gold text-black text-xs px-1 rounded-full">{count}</span>}
          </Link>
          {token ? <button onClick={logout} className="px-3 py-1 border rounded">Salir</button> : <Link to="/login" className="px-3 py-1 border rounded">Iniciar</Link>}
        </div>
      </div>
    </motion.header>
  )
}
