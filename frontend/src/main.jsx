import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { CartProvider } from './context/CartContext'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'
import toast from 'react-hot-toast'

axios.defaults.baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
axios.interceptors.response.use(
  res => res,
  err => {
    if (err.config?.showGlobalErrorToast) {
      const msg = err.response?.data?.error || err.message || 'Error de red'
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3600,
          style: {
            borderRadius: '16px',
            border: '1px solid rgba(57, 35, 44, 0.1)',
            background: '#fffdf9',
            color: '#28161e',
            boxShadow: '0 18px 55px rgba(49, 24, 34, 0.16)',
            padding: '12px 14px',
          },
        }}
      />
    </CartProvider>
  </React.StrictMode>
)
