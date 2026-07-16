import React from 'react'
import { Outlet } from 'react-router-dom'
import Footer from './Footer'
import Navbar from './Navbar'

export default function StoreLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fffaf5] text-matte">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>
      <Navbar />
      <div id="main-content" tabIndex="-1" className="min-w-0 flex-1 outline-none">
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
