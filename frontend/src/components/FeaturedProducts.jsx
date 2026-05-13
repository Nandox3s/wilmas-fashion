import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ProductCard from './ProductCard'

export default function FeaturedProducts(){
  const [items, setItems] = useState([])
  useEffect(()=>{
    axios.get('/api/products').then(r=>setItems(r.data.items)).catch(()=>{})
  },[])

  function addToCart(p){
    alert(`Agregado ${p.name} al carrito (demo)`)
  }

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Productos destacados</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {items.map(p=> <ProductCard key={p.id} product={p} onAdd={addToCart} />)}
      </div>
    </section>
  )
}
