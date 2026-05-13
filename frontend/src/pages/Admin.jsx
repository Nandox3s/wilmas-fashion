import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import axios from 'axios'
import ProductModal from '../components/ProductModal'

export default function Admin(){
  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
  const [items, setItems] = useState([])
  const [users, setUsers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(()=>{ load() ; loadUsers() }, [])
  async function load(){ const res = await axios.get('/api/products'); setItems(res.data.items) }
  async function loadUsers(){ try{ const token = localStorage.getItem('token'); const res = await axios.get('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }); setUsers(res.data.users) }catch(e){ setUsers([]) } }

  if(role !== 'ADMIN') return <div className="p-8">Acceso denegado</div>

  async function changeRole(userId, newRole){
    const token = localStorage.getItem('token')
    await axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } })
    loadUsers()
  }

  async function removeUser(userId){
    if(!confirm('Eliminar usuario?')) return
    const token = localStorage.getItem('token')
    await axios.delete(`/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
    loadUsers()
  }

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Gestionar Productos</h2>
              <button onClick={()=>{ setEditing(null); setShowModal(true) }} className="btn-primary px-4 py-2 rounded">Nuevo producto</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {items.map(p=> (
                <div key={p.id} className="bg-white rounded p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">SKU: {p.sku} — Stock: {p.stock}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{ setEditing(p); setShowModal(true) }} className="px-3 py-1 border rounded">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Gestionar Usuarios</h2>
            <div className="bg-white rounded p-4">
              <table className="w-full text-left">
                <thead className="text-sm text-gray-500 border-b">
                  <tr>
                    <th className="py-2">Nombre</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u=> (
                    <tr key={u.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select value={u.role} onChange={e=>changeRole(u.id, e.target.value)} className="border rounded px-2 py-1">
                          <option value="ADMIN">ADMIN</option>
                          <option value="SELLER">SELLER</option>
                        </select>
                      </td>
                      <td className="text-right"><button onClick={()=>removeUser(u.id)} className="text-red-600">Eliminar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {showModal && <ProductModal product={editing} onClose={()=>{ setShowModal(false); load(); setEditing(null) }} />}
    </div>
  )
}
