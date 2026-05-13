import React from 'react'
import { useCart } from '../context/CartContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Cart(){
  const { items, updateQty, remove, total, clear } = useCart()
  const navigate = useNavigate()

  async function checkout(){
    const token = localStorage.getItem('token')
    if(!token) return navigate('/login')
    try{
      for(const it of items){
        await axios.post('/api/stats/sale', { productId: it.id, quantity: it.qty }, { headers: { Authorization: `Bearer ${token}` } })
      }
      clear()
      toast.success('Compra simulada completa')
    }catch(err){ alert('Error al realizar compra: '+ (err.response?.data?.error || err.message)) }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h2 className="text-2xl font-semibold mb-6">Carrito</h2>
      {items.length===0 && <div className="text-gray-500">Tu carrito está vacío</div>}
      {items.length>0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="bg-white rounded p-4">
              {items.map(it=> (
                <div key={it.id} className="flex items-center justify-between border-b py-3">
                  <div className="flex items-center gap-4">
                    <img src={it.image||'/src/assets/placeholder.jpg'} className="w-20 h-20 object-cover rounded" />
                    <div>
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-gray-500">SKU: {it.sku}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-2">${it.price}</div>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={()=> updateQty(it.id, Math.max(1, (it.qty||1)-1)) } className="px-2 border rounded">-</button>
                      <div className="px-3">{it.qty}</div>
                      <button onClick={()=> updateQty(it.id, (it.qty||1)+1) } className="px-2 border rounded">+</button>
                      <button onClick={()=> remove(it.id)} className="ml-4 text-red-600">Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="bg-white rounded p-4">
              <div className="text-sm text-gray-500">Resumen</div>
              <div className="text-2xl font-bold mt-2">${total.toFixed(2)}</div>
              <button onClick={checkout} className="mt-4 btn-primary w-full py-3 rounded">Pagar ahora</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
