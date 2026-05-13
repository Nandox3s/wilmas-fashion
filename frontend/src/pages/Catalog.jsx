import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ProductCard from '../components/ProductCard'
import Navbar from '../components/Navbar'
import { useParams } from 'react-router-dom'

const SIZES = ['XS','S','M','L','XL']

export default function Catalog(){
  const params = useParams()
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [size, setSize] = useState('')
  const [category, setCategory] = useState(params?.name || '')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [onOffer, setOnOffer] = useState('')

  useEffect(()=>{ load() }, [])
  useEffect(()=>{ // if route param changes, set category and reload
    if (params?.name) {
      setCategory(params.name)
      load()
    }
  }, [params?.name])

  async function load(){
    const params = {}
    if(q) params.q = q
    if(size) params.size = size
    if(category) params.category = category
    if(minPrice) params.minPrice = minPrice
    if(maxPrice) params.maxPrice = maxPrice
    if(onOffer) params.onOffer = onOffer
    const res = await axios.get('/api/products', { params })
    setItems(res.data.items)
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold mb-6">Catálogo {category ? `— ${category}` : ''}</h2>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input placeholder="Buscar por nombre o SKU" value={q} onChange={e=>setQ(e.target.value)} className="border rounded px-3 py-2 col-span-1 md:col-span-2" />
          <select value={size} onChange={e=>setSize(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Talla</option>
            {SIZES.map(s=> <option key={s} value={s}>{s}</option>)}
          </select>
          <input placeholder="Categoria" value={category} onChange={e=>setCategory(e.target.value)} className="border rounded px-3 py-2" />
          <input placeholder="Min Precio" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="border rounded px-3 py-2" />
          <input placeholder="Max Precio" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="border rounded px-3 py-2" />
          <select value={onOffer} onChange={e=>setOnOffer(e.target.value)} className="border rounded px-3 py-2">
            <option value="">Oferta</option>
            <option value="true">Solo en oferta</option>
            <option value="false">No en oferta</option>
          </select>
          <div className="col-span-1 md:col-span-4 flex gap-2">
            <button onClick={load} className="btn-primary px-4 py-2 rounded">Aplicar</button>
            <button onClick={()=>{ setQ(''); setSize(''); setCategory(''); setMinPrice(''); setMaxPrice(''); setOnOffer(''); load() }} className="px-4 py-2 border rounded">Limpiar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map(p=> <ProductCard key={p.id} product={p} onAdd={()=>alert('Agregado al carrito')} />)}
        </div>
      </div>
    </div>
  )
}
