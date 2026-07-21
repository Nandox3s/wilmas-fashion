import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import StoreLayout from './components/StoreLayout'
import { sessionPayload } from './services/apiClient'

const Home = lazy(() => import('./pages/Home'))
const Catalog = lazy(() => import('./pages/Catalog'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const ProductsOverview = lazy(() => import('./pages/ProductsOverview'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Admin = lazy(() => import('./pages/Admin'))
const MyOrders = lazy(() => import('./pages/MyOrders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const PaymentResult = lazy(() => import('./pages/PaymentResult'))

function hasValidSession() {
  return Boolean(sessionPayload())
}
function PrivateRoute({ children, allowedRoles }) {
  const location = useLocation()
  if (!hasValidSession()) return <Navigate to="/login" state={{ from: location }} replace />
  if (allowedRoles && !allowedRoles.includes(sessionPayload()?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function PageLoader() {
  return (
    <div className="mx-auto grid min-h-[55vh] max-w-7xl place-items-center px-4" role="status" aria-live="polite">
      <div className="text-center">
        <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-[#6d1738]/20 border-t-[#6d1738]" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold text-[#705d65]">Preparando tu experiencia…</p>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <main className="min-h-[65vh] bg-[#f8f3ef] px-4 py-16 text-center">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#39232c]/10 bg-white px-5 py-14 shadow-sm">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-[#28161e]">Esta página salió de colección</h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[#705d65]">El enlace no existe o cambió de lugar.</p>
        <Link to="/" className="button-primary mt-7">Volver al inicio</Link>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="category/:name" element={<Catalog />} />
            <Route path="products" element={<ProductsOverview />} />
            <Route path="product/:id" element={<Product />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="payment-result" element={<PaymentResult />} />
            <Route path="orders" element={<PrivateRoute allowedRoles={['USER', 'ADMIN']}><MyOrders /></PrivateRoute>} />
            <Route path="orders/:reference" element={<PrivateRoute allowedRoles={['USER', 'ADMIN']}><OrderDetail /></PrivateRoute>} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="dashboard/*" element={<PrivateRoute allowedRoles={['USER', 'ADMIN']}><Dashboard /></PrivateRoute>} />
          <Route path="admin" element={<PrivateRoute allowedRoles={['ADMIN']}><Admin /></PrivateRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
