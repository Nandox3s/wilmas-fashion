import React, { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export default function ProductModal({ product, onClose }){
  const [form, setForm] = useState({ name:'', sku:'', category:'', size:'', color:'', price:0, stock:0, image: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(()=>{
    if (product) setForm({ name: product.name, sku: product.sku, category: product.category, size: product.size, color: product.color, price: product.price, stock: product.stock, image: product.image || '' })
    else setForm({ name:'', sku:'', category:'', size:'', color:'', price:0, stock:0, image: '' })
  },[product])

  async function handleUpload() {
    if (!file) return null
    const token = localStorage.getItem('token')
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post('/api/upload', fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } })
    return res.data.url
  }

  async function submit(e){
    e.preventDefault()
    setError(null)
    if (!form.name || !form.sku) return setError('Nombre y SKU son obligatorios')
    setSubmitting(true)
    try{
      const token = localStorage.getItem('token')
      let imageUrl = form.image
      if (file) imageUrl = await handleUpload()
      if (product) {
        await axios.put(`/api/products/${product.id}`, { ...form, image: imageUrl }, { headers: { Authorization: `Bearer ${token}` } })
      } else {
        await axios.post('/api/products', { ...form, image: imageUrl }, { headers: { Authorization: `Bearer ${token}` } })
      }
      toast.success('Producto guardado')
      onClose()
    }catch(err){
      const msg = err.response?.data?.error || 'Error al guardar'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-xl p-6">
        <h3 className="text-lg font-semibold mb-4">{product ? 'Editar producto' : 'Nuevo producto'}</h3>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Nombre" className="col-span-2 border rounded px-2 py-2" />
          <input value={form.sku} onChange={e=>setForm({...form, sku: e.target.value})} placeholder="SKU" className="border rounded px-2 py-2" />
          <input value={form.category} onChange={e=>setForm({...form, category: e.target.value})} placeholder="Categoría" className="border rounded px-2 py-2" />
          <input value={form.size} onChange={e=>setForm({...form, size: e.target.value})} placeholder="Talla" className="border rounded px-2 py-2" />
          <input value={form.color} onChange={e=>setForm({...form, color: e.target.value})} placeholder="Color" className="border rounded px-2 py-2" />
          <input type="number" value={form.price} onChange={e=>setForm({...form, price: parseFloat(e.target.value)})} placeholder="Precio" className="border rounded px-2 py-2" />
          <input type="number" value={form.stock} onChange={e=>setForm({...form, stock: parseInt(e.target.value)})} placeholder="Stock" className="border rounded px-2 py-2" />
          <div className="col-span-2">
            <label className="block text-sm text-gray-600">Imagen</label>
            <input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0])} className="mt-1" />
            {form.image && !file && <div className="text-sm text-gray-500 mt-1">Imagen actual: <a className="text-indigo-600" href={form.image} target="_blank" rel="noreferrer">ver</a></div>}
            {file && (
              <div className="mt-2 flex items-center gap-3">
                <img src={URL.createObjectURL(file)} alt="preview" className="w-20 h-20 object-cover rounded" />
                <div className="text-sm text-gray-600">{file.name}</div>
              </div>
            )}
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded border">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-3 py-2 rounded bg-indigo-600 text-white disabled:opacity-60">{submitting ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
