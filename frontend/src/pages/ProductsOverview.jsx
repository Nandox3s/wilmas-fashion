import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Navbar from '../components/Navbar'

export default function ProductsOverview(){
  const [overview, setOverview] = useState(null)
  const [products, setProducts] = useState([])

  useEffect(()=>{
    load()
  },[])

  async function load(){
    try{
      const token = localStorage.getItem('token')
      const [ov, pr] = await Promise.all([
        axios.get('/api/stats/overview', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        axios.get('/api/products', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      ])
      setOverview(ov.data)
      setProducts(pr.data.items)
    }catch(e){ console.error(e) }
  }

  return (
    <div className="min-h-screen bg-soft-gray">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Vista general de productos</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-500">Total productos</div>
            <div className="text-2xl font-bold">{overview?.totalProducts ?? products.length}</div>
          </div>
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-500">Productos en oferta</div>
            <div className="text-2xl font-bold">{products.filter(p=>p.onOffer).length}</div>
          </div>
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-500">Productos bajo stock</div>
            <div className="text-2xl font-bold">{overview?.lowStock?.length ?? products.filter(p=>p.stock < 10).length}</div>
          </div>
        </div>

        <div className="bg-white rounded shadow">
          <table className="w-full text-left">
            <thead className="text-sm text-gray-500 border-b bg-gray-50">
              <tr>
                <th className="p-3">Producto</th>
                <th>SKU</th>
                <th>Categoria</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Oferta</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p=> (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.category}</td>
                  <td>${p.price}</td>
                  <td className={p.stock<10? 'text-red-600 font-semibold':''}>{p.stock}</td>
                  <td>{p.onOffer? 'Sí' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
