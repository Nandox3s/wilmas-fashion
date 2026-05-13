import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('admin@wilmas.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      // store role for UI permissions
      if (res.data.user?.role) localStorage.setItem('role', res.data.user.role)
      toast.success('Inicio de sesión correcto')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed'
      setError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-4">Wilmas Fashion — Login</h1>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit}>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 mb-3 w-full border rounded px-3 py-2" />
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 mb-4 w-full border rounded px-3 py-2" />
          <button className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Entrar</button>
        </form>
      </div>
    </div>
  )
}
