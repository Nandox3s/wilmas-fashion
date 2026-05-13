import React, { useEffect, useState } from 'react'
import axios from 'axios'
import ProductModal from './ProductModal'

export default function ProductTable(){
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const role = localStorage.getItem('role') || 'SELLER'

  async function load(qparam){
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/products' + (qparam? `?q=${encodeURIComponent(qparam)}` : ''), { headers: { Authorization: `Bearer ${token}` } })
    setItems(res.data.items)
  }

  useEffect(()=>{ load('') }, [])

  async function createProduct(){
    setEditing(null)
    setShowModal(true)
  }

  async function editProduct(p){
    setEditing(p)
    setShowModal(true)
  }

  async function deleteProduct(p){
    if (!confirm(`Eliminar ${p.name}?`)) return
    const token = localStorage.getItem('token')
    await axios.delete(`/api/products/${p.id}`, { headers: { Authorization: `Bearer ${token}` } })
    load(q)
  }

  async function sellProduct(p){
    const qty = parseInt(prompt('Cantidad a vender', '1') || '1')
    if (!qty || qty <= 0) return
    const token = localStorage.getItem('token')
    await axios.post('/api/stats/sale', { productId: p.id, quantity: qty }, { headers: { Authorization: `Bearer ${token}` } })
    load(q)
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 gap-3">
        <h3 className="font-semibold">Productos</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar por nombre, SKU o categoría" className="flex-1 md:flex-none border rounded px-3 py-2" />
          <button onClick={()=>load(q)} className="bg-gray-100 px-3 rounded">Buscar</button>
          <button onClick={createProduct} className="bg-indigo-600 text-white px-3 rounded">Nuevo</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-sm text-gray-500 border-b bg-gray-50">
            <tr>
              <th className="py-2">Producto</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Precio</th>
              <th>Stock</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(p=> (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="py-2 flex items-center gap-3">
                  {p.image ? <img src={p.image} alt="img" className="w-12 h-12 object-cover rounded" /> : <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-sm text-gray-400">No Img</div>}
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">{p.color} • {p.size}</div>
                  </div>
                </td>
                <td>{p.sku}</td>
                <td>{p.category}</td>
                <td>${p.price}</td>
                <td className={p.stock < 10 ? 'text-red-600 font-semibold' : ''}>{p.stock}</td>
                <td className="text-right">
                  <button onClick={()=>sellProduct(p)} className="text-sm text-green-600 mr-2">Vender</button>
                  <button onClick={()=>editProduct(p)} className="text-sm text-blue-600 mr-2">Editar</button>
                  {role === 'ADMIN' && <button onClick={()=>deleteProduct(p)} className="text-sm text-red-600">Eliminar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <ProductModal
          product={editing}
          onClose={() => { setShowModal(false); setEditing(null); load(q) }}
        />
      )}
    </div>
  )
}
