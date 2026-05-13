import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useCart } from '../context/CartContext'

export default function Product(){
  const { id } = useParams()
  const [p, setP] = useState(null)
  const { add } = useCart()
  useEffect(()=>{ axios.get(`/api/products/${id}`).then(r=>setP(r.data)).catch(()=>{}) },[id])
  if(!p) return <div className="p-8">Cargando...</div>
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <img src={p.image || '/src/assets/placeholder.jpg'} alt={p.name} className="w-full h-[560px] object-cover rounded" />
        <div>
          <h1 className="text-3xl font-bold">{p.name}</h1>
          <div className="text-gray-500 mt-2">SKU: {p.sku}</div>
          <div className="mt-4 text-2xl font-semibold">${p.price}</div>
          <p className="mt-6 text-gray-600">Categoría: {p.category}</p>
          <div className="mt-6">
            <button onClick={()=>add(p,1)} className="btn-primary px-4 py-3 rounded">Agregar al carrito</button>
          </div>
        </div>
      </div>
    </div>
  )
}
