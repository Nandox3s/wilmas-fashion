import React from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ProductCard({ product, onAdd }){
  function handleAdd() {
    try {
      onAdd(product)
      toast.success('Añadido al carrito')
    } catch (e) {
      toast.error('No se pudo añadir al carrito')
    }
  }

  return (
    <motion.div whileHover={{ y: -6 }} className="bg-white rounded-lg p-4 card">
      <div className="relative">
        <img src={product.image || '/src/assets/placeholder.jpg'} alt={product.name} className="w-full h-64 object-cover rounded-md" />
        {product.stock < 10 && <div className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">Low</div>}
      </div>
      <div className="mt-3">
        <div className="font-semibold">{product.name}</div>
        <div className="text-sm text-gray-500">{product.category} • {product.size}</div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">${product.price}</div>
            {product.price && <div className="text-sm text-gray-400 line-through">${(product.price*1.2).toFixed(2)}</div>}
          </div>
          <button onClick={handleAdd} className="btn-primary px-3 py-2 rounded">Agregar</button>
        </div>
      </div>
    </motion.div>
  )
}
