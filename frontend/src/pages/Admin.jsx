import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import ProductModal from '../components/ProductModal'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getSessionUserId() {
  const token = localStorage.getItem('token')
  if (!token) return null
  try {
    const encoded = token.split('.')[1]
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')))
    return Number(payload.userId) || null
  } catch {
    return null
  }
}

function parseSizes(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : [value]
  } catch {
    return value.split(',').map((size) => size.trim()).filter(Boolean)
  }
}

function resolveImageUrl(image) {
  if (!image) return ''
  if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image
  if (image.startsWith('/img_wf/')) return image
  const path = image.startsWith('/') ? image : `/uploads/${image}`
  const apiBase = axios.defaults.baseURL
  return apiBase && /^https?:\/\//i.test(apiBase) ? `${apiBase.replace(/\/$/, '')}${path}` : path
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'USD' }).format(Number(value) || 0)
}

function trapFocus(event, container) {
  if (event.key !== 'Tab' || !container) return
  const focusable = [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
  if (focusable.length === 0) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export default function Admin() {
  const role = localStorage.getItem('role')
  const currentUserId = getSessionUserId()
  const [products, setProducts] = useState([])
  const [users, setUsers] = useState([])
  const [productQuery, setProductQuery] = useState('')
  const [productsLoading, setProductsLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [usersError, setUsersError] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [updatingRoleId, setUpdatingRoleId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (role !== 'ADMIN') return
    loadProducts()
    loadUsers()
  }, [role])

  async function loadProducts() {
    setProductsLoading(true)
    setProductsError('')
    try {
      const response = await axios.get('/api/products', { params: { limit: 100 }, headers: authHeaders() })
      setProducts(Array.isArray(response.data?.items) ? response.data.items : [])
    } catch (requestError) {
      setProductsError(requestError.response?.data?.error || 'No se pudieron cargar los productos.')
    } finally {
      setProductsLoading(false)
    }
  }

  async function loadUsers() {
    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await axios.get('/api/users', { headers: authHeaders() })
      setUsers(Array.isArray(response.data) ? response.data : [])
    } catch (requestError) {
      setUsersError(requestError.response?.data?.error || 'No se pudieron cargar los usuarios.')
    } finally {
      setUsersLoading(false)
    }
  }

  async function changeRole(userId, nextRole) {
    setUpdatingRoleId(userId)
    setUsersError('')
    try {
      const response = await axios.patch(`/api/users/${userId}/role`, { role: nextRole }, { headers: authHeaders() })
      setUsers((current) => current.map((user) => user.id === userId ? response.data : user))
      toast.success('Rol actualizado')
    } catch (requestError) {
      setUsersError(requestError.response?.data?.error || 'No se pudo actualizar el rol.')
    } finally {
      setUpdatingRoleId(null)
    }
  }

  function requestDeleteUser(user) {
    setDeleteError('')
    setDeleteTarget(user)
  }

  async function removeUser() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      await axios.delete(`/api/users/${deleteTarget.id}`, { headers: authHeaders() })
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id))
      toast.success('Usuario eliminado')
      setDeleteTarget(null)
    } catch (requestError) {
      setDeleteError(requestError.response?.data?.error || 'No se pudo eliminar el usuario.')
    } finally {
      setDeleting(false)
    }
  }

  function closeProductModal() {
    setShowProductModal(false)
    setEditing(null)
  }

  function productSaved() {
    closeProductModal()
    loadProducts()
  }

  const visibleProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase('es')
    if (!query) return products
    return products.filter((product) => [product.name, product.sku, product.brand, product.category]
      .some((value) => String(value || '').toLocaleLowerCase('es').includes(query)))
  }, [productQuery, products])

  if (role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-12 text-center">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">Acceso restringido</p>
            <h1 className="mt-3 text-3xl font-black text-slate-950">No tienes permisos de administrador</h1>
            <p className="mt-3 text-slate-600">Inicia sesión con una cuenta autorizada para gestionar productos y usuarios.</p>
            <Link to="/" className="mt-6 inline-flex rounded-xl bg-[#5B0E2D] px-5 py-3 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2">Volver a la tienda</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#5B0E2D]">Administración</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Productos y usuarios</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">Gestiona el inventario y los permisos con los datos actuales de la API.</p>
          </div>
          <button type="button" onClick={() => { setEditing(null); setShowProductModal(true) }} className="self-start rounded-xl bg-[#5B0E2D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2 sm:self-auto">Nuevo producto</button>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section aria-labelledby="admin-products-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 id="admin-products-title" className="text-xl font-bold text-slate-950">Inventario</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{visibleProducts.length} de {products.length} productos</p>
                </div>
                <div className="flex gap-2">
                  <label htmlFor="admin-product-search" className="sr-only">Filtrar productos</label>
                  <input id="admin-product-search" type="search" value={productQuery} onChange={(event) => setProductQuery(event.target.value)} placeholder="Filtrar productos" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#5B0E2D] focus:ring-2 focus:ring-[#5B0E2D]/10 sm:w-48" />
                  <button type="button" onClick={loadProducts} disabled={productsLoading} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50" aria-label="Actualizar productos">Actualizar</button>
                </div>
              </div>
            </div>

            {productsError && <ErrorBanner message={productsError} onRetry={loadProducts} />}
            {productsLoading ? (
              <LoadingRows label="Cargando productos" />
            ) : visibleProducts.length === 0 ? (
              <EmptyState title="No hay productos" detail={productQuery ? 'No encontramos coincidencias para ese filtro.' : 'Crea el primer producto del inventario.'} />
            ) : (
              <div className="grid max-h-[720px] gap-3 overflow-y-auto p-4 sm:p-5">
                {visibleProducts.map((product) => (
                  <ProductAdminCard key={product.id} product={product} onEdit={() => { setEditing(product); setShowProductModal(true) }} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="admin-users-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="admin-users-title" className="text-xl font-bold text-slate-950">Usuarios</h2>
                <p className="mt-0.5 text-xs text-slate-500">{users.length} cuentas registradas</p>
              </div>
              <button type="button" onClick={loadUsers} disabled={usersLoading} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50">Actualizar</button>
            </div>

            {usersError && <ErrorBanner message={usersError} onRetry={loadUsers} />}
            {usersLoading ? (
              <LoadingRows label="Cargando usuarios" />
            ) : users.length === 0 ? (
              <EmptyState title="No hay usuarios" detail="Las cuentas registradas aparecerán aquí." />
            ) : (
              <>
                <div className="grid gap-3 p-4 md:hidden">
                  {users.map((user) => <UserCard key={user.id} user={user} currentUserId={currentUserId} busy={updatingRoleId === user.id} onRoleChange={changeRole} onDelete={requestDeleteUser} />)}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr><th scope="col" className="px-6 py-3">Usuario</th><th scope="col" className="px-4 py-3">Rol</th><th scope="col" className="px-6 py-3 text-right">Acción</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => <UserRow key={user.id} user={user} currentUserId={currentUserId} busy={updatingRoleId === user.id} onRoleChange={changeRole} onDelete={requestDeleteUser} />)}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {showProductModal && <ProductModal product={editing} onClose={closeProductModal} onSaved={productSaved} />}
      {deleteTarget && <DeleteUserDialog user={deleteTarget} busy={deleting} error={deleteError} onCancel={() => setDeleteTarget(null)} onConfirm={removeUser} />}
    </div>
  )
}

function ProductAdminCard({ product, onEdit }) {
  const [failed, setFailed] = useState(false)
  const source = resolveImageUrl(product.image)
  const sizes = parseSizes(product.sizes ?? product.size)
  useEffect(() => setFailed(false), [source])
  return (
    <article className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
      {source && !failed ? <img src={source} onError={() => setFailed(true)} alt={`Miniatura de ${product.name}`} className="h-16 w-14 shrink-0 rounded-xl object-cover" /> : <div aria-hidden="true" className="grid h-16 w-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">WF</div>}
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-slate-900">{product.name}</h3>
        <p className="mt-0.5 truncate text-xs text-slate-500">{product.brand || 'Sin marca'} · {product.sku}</p>
        <p className="mt-1 text-xs text-slate-500">{sizes.join(', ') || 'Sin talla'} · Stock {product.stock}</p>
        <p className="mt-1 text-sm font-bold text-slate-950">{formatMoney(product.price)}</p>
      </div>
      <button type="button" onClick={onEdit} aria-label={`Editar ${product.name}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D]">Editar</button>
    </article>
  )
}

function RoleSelect({ user, busy, locked = false, onRoleChange }) {
  return (
    <>
      <label htmlFor={`role-${user.id}`} className="sr-only">Rol de {user.name}</label>
      <select id={`role-${user.id}`} value={user.role} disabled={busy || locked} title={locked ? 'No puedes cambiar tu propio rol' : undefined} onChange={(event) => onRoleChange(user.id, event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#5B0E2D] focus:ring-2 focus:ring-[#5B0E2D]/10 disabled:cursor-not-allowed disabled:opacity-60">
        <option value="USER">Usuario</option>
        <option value="ADMIN">Administrador</option>
      </select>
    </>
  )
}

function UserRow({ user, currentUserId, busy, onRoleChange, onDelete }) {
  const isCurrent = user.id === currentUserId
  return (
    <tr className="hover:bg-slate-50/80">
      <td className="px-6 py-4"><div className="font-semibold text-slate-900">{user.name} {isCurrent && <span className="ml-1 text-xs font-medium text-[#5B0E2D]">Tú</span>}</div><div className="mt-0.5 text-xs text-slate-500">{user.email}</div></td>
      <td className="px-4 py-4"><RoleSelect user={user} busy={busy} locked={isCurrent} onRoleChange={onRoleChange} /></td>
      <td className="px-6 py-4 text-right"><button type="button" onClick={() => onDelete(user)} disabled={isCurrent} aria-label={isCurrent ? 'No puedes eliminar tu propia cuenta' : `Eliminar a ${user.name}`} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-35">Eliminar</button></td>
    </tr>
  )
}

function UserCard({ user, currentUserId, busy, onRoleChange, onDelete }) {
  const isCurrent = user.id === currentUserId
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="min-w-0"><h3 className="font-semibold text-slate-900">{user.name} {isCurrent && <span className="text-xs text-[#5B0E2D]">Tú</span>}</h3><p className="mt-0.5 break-all text-xs text-slate-500">{user.email}</p></div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <RoleSelect user={user} busy={busy} locked={isCurrent} onRoleChange={onRoleChange} />
        <button type="button" onClick={() => onDelete(user)} disabled={isCurrent} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-35">Eliminar</button>
      </div>
    </article>
  )
}

function DeleteUserDialog({ user, busy, error, onCancel, onConfirm }) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef(null)
  const closeRef = useRef(onCancel)
  const busyRef = useRef(busy)
  const dialogRef = useRef(null)
  closeRef.current = onCancel
  busyRef.current = busy

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => cancelRef.current?.focus(), 0)
    function keydown(event) { trapFocus(event, dialogRef.current); if (event.key === 'Escape' && !busyRef.current) closeRef.current?.() }
    document.addEventListener('keydown', keydown)
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; previousFocus?.focus?.() }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">Acción permanente</p>
        <h2 id={titleId} className="mt-2 text-xl font-bold text-slate-950">Eliminar usuario</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">Se eliminará la cuenta de <strong>{user.name}</strong> ({user.email}). Esta acción no se puede deshacer.</p>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:opacity-60">{busy ? 'Eliminando…' : 'Eliminar cuenta'}</button>
        </div>
      </section>
    </div>
  )
}

function ErrorBanner({ message, onRetry }) {
  return <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{message}</span><button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600">Reintentar</button></div>
}

function LoadingRows({ label }) {
  return <div aria-live="polite" aria-busy="true" className="space-y-3 p-5"><span className="sr-only">{label}</span>{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
}

function EmptyState({ title, detail }) {
  return <div className="px-6 py-14 text-center"><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{detail}</p></div>
}
