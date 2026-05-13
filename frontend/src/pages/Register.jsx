import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Register(){
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function submit(e){
    e.preventDefault()
    try{
      await axios.post('/api/auth/register', { name, email, password })
      toast.success('Cuenta creada. Por favor inicia sesión')
      navigate('/login')
    }catch(err){ setError(err.response?.data?.error || 'Error') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-soft-gray">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit}>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nombre" className="mb-2 w-full border rounded px-3 py-2" />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="mb-2 w-full border rounded px-3 py-2" />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Contraseña" className="mb-4 w-full border rounded px-3 py-2" />
          <button className="w-full btn-primary py-2 rounded">Registrarse</button>
        </form>
      </div>
    </div>
  )
}
