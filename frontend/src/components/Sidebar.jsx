import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export default function Sidebar(){
  const navigate = useNavigate()
  function logout(){
    localStorage.removeItem('token')
    navigate('/login')
  }
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Wilmas</h1>
        <div className="text-sm text-gray-500">Administrador</div>
      </div>
      <nav className="space-y-2">
        <NavLink to="/dashboard" className={({isActive})=>`block px-3 py-2 rounded ${isActive? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}>Dashboard</NavLink>
        <NavLink to="/dashboard/products" className={({isActive})=>`block px-3 py-2 rounded ${isActive? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}`}>Productos</NavLink>
      </nav>
      <div className="mt-6">
        <button onClick={logout} className="w-full text-left text-red-600">Cerrar sesión</button>
      </div>
    </aside>
  )
}
