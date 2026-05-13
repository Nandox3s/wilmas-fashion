import React from 'react'

export default function Footer(){
  return (
    <footer className="bg-matte text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h4 className="font-bold text-lg">Wilmas Fashion</h4>
          <p className="text-sm text-gray-300 mt-2">Moda premium con diseño futurista.</p>
        </div>
        <div>
          <h5 className="font-semibold">Contacto</h5>
          <p className="text-sm text-gray-300 mt-2">hola@wilmas.com</p>
        </div>
        <div>
          <h5 className="font-semibold">Redes</h5>
          <div className="flex gap-3 mt-2 text-gray-300">
            <a href="#">Instagram</a>
            <a href="#">Facebook</a>
            <a href="#">TikTok</a>
          </div>
        </div>
      </div>
      <div className="text-center text-gray-400 py-4">© {new Date().getFullYear()} Wilmas Fashion</div>
    </footer>
  )
}
