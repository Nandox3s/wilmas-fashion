import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { shouldClearSession } from './services/apiClient'
import { API_TIMEOUT_MS, friendlyApiError } from './services/apiClient'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import { CartProvider } from './context/CartContext'
import toast, { Toaster } from 'react-hot-toast'
import axios from 'axios'

const configuredApiBase = import.meta.env.VITE_API_BASE || ''
// Existing service paths already start with /api; keep /api same-origin without duplicating it.
axios.defaults.baseURL = configuredApiBase === '/api' ? '' : configuredApiBase
axios.defaults.timeout = API_TIMEOUT_MS
axios.interceptors.response.use(
  res => res,
  err => {
    if (shouldClearSession(err, localStorage.getItem('token'))) {
      ;['token', 'role', 'wf_user', 'user'].forEach((key) => localStorage.removeItem(key))
      toast.error('Tu sesión ha expirado. Inicia sesión nuevamente.')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    if (err.response?.status === 403 && err.config?.showGlobalErrorToast) toast.error('No tienes permisos para realizar esta acción.')
    else if (err.config?.showGlobalErrorToast) toast.error(friendlyApiError(err))
    return Promise.reject(err)
  }
)

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CartProvider>
      <ErrorBoundary><App /></ErrorBoundary>
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
