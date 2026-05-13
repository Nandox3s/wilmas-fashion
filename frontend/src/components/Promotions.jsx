import React from 'react'

export default function Promotions(){
  return (
    <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg p-6 card">
        <h3 className="text-xl font-semibold">Black Velvet Sale</h3>
        <p className="text-sm text-gray-500 mt-2">Hasta 40% en prendas seleccionadas.</p>
        <div className="mt-4">
          <button className="px-4 py-2 btn-primary rounded">Ver ofertas</button>
        </div>
      </div>
      <div className="bg-gradient-to-br from-vino to-matte text-white rounded-lg p-8">
        <h3 className="text-2xl font-bold">Nueva Colección Futurista</h3>
        <p className="mt-2 text-sm">Edición limitada — materiales premium.</p>
      </div>
    </section>
  )
}
