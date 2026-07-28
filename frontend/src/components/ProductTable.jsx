import { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import ProductModal from './ProductModal'

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
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
  return apiBase && /^https?:\/\//i.test(apiBase)
    ? `${apiBase.replace(/\/$/, '')}${path}`
    : path
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

export default function ProductTable({ onChanged }) {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showProductModal, setShowProductModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [saleTarget, setSaleTarget] = useState(null)
  const [saleQuantity, setSaleQuantity] = useState('1')
  const [saleError, setSaleError] = useState('')
  const [selling, setSelling] = useState(false)
  const role = localStorage.getItem('role') || 'USER'
  const canManage = ['USER', 'ADMIN'].includes(role)
  const canDelete = role === 'ADMIN'
  const canSell = role === 'ADMIN'

  useEffect(() => {
    loadProducts('')
  }, [])

  async function loadProducts(search = appliedQuery) {
    setLoading(true)
    setError('')
    try {
      const response = await axios.get('/api/products', {
        params: { limit: 100, ...(search ? { search } : {}) },
        headers: authHeaders()
      })
      setItems(Array.isArray(response.data?.items) ? response.data.items : [])
      setAppliedQuery(search)
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'No se pudo cargar el inventario.')
    } finally {
      setLoading(false)
    }
  }

  function submitSearch(event) {
    event.preventDefault()
    loadProducts(query.trim())
  }

  function clearSearch() {
    setQuery('')
    loadProducts('')
  }

  function openCreate() {
    setEditing(null)
    setShowProductModal(true)
  }

  function openEdit(product) {
    setEditing(product)
    setShowProductModal(true)
  }

  function closeProductModal() {
    setShowProductModal(false)
    setEditing(null)
  }

  function productSaved() {
    closeProductModal()
    loadProducts(appliedQuery)
    onChanged?.()
  }

  async function deleteProduct() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await axios.delete(`/api/products/${deleteTarget.id}`, { headers: authHeaders() })
      toast.success(`${deleteTarget.name} fue eliminado`)
      setDeleteTarget(null)
      await loadProducts(appliedQuery)
      onChanged?.()
    } catch (requestError) {
      setDeleteError(requestError.response?.data?.error || 'No se pudo eliminar el producto.')
    } finally {
      setDeleting(false)
    }
  }

  function openSale(product) {
    setSaleTarget(product)
    setSaleQuantity('1')
    setSaleError('')
  }

  function requestDelete(product) {
    setDeleteError('')
    setDeleteTarget(product)
  }

  async function registerSale(event) {
    event.preventDefault()
    if (!saleTarget) return

    const quantity = Number(saleQuantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      setSaleError('La cantidad debe ser un entero mayor que cero.')
      return
    }
    if (quantity > Number(saleTarget.stock || 0)) {
      setSaleError(`Solo hay ${saleTarget.stock} unidades disponibles.`)
      return
    }

    setSelling(true)
    setSaleError('')
    try {
      const response = await axios.post('/api/sales', {
        productId: Number(saleTarget.id),
        quantity
      }, { headers: authHeaders() })

      const remainingStock = response.data?.remainingStock
      toast.success(`Venta registrada: ${quantity} × ${saleTarget.name}`)
      setSaleTarget(null)
      if (Number.isInteger(remainingStock)) {
        setItems((current) => current.map((product) => (
          product.id === saleTarget.id ? { ...product, stock: remainingStock } : product
        )))
      } else {
        await loadProducts(appliedQuery)
      }
      onChanged?.()
    } catch (requestError) {
      setSaleError(requestError.response?.data?.error || 'No se pudo registrar la venta.')
    } finally {
      setSelling(false)
    }
  }

  return (
    <section aria-labelledby="inventory-title" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5B0E2D]">Inventario</p>
            <h2 id="inventory-title" className="mt-1 text-xl font-bold text-slate-950">Productos</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? 'Actualizando inventario…' : `${items.length} resultados${appliedQuery ? ` para “${appliedQuery}”` : ''}`}
            </p>
          </div>

          <form onSubmit={submitSearch} role="search" className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl">
            <div className="min-w-0 flex-1">
              <label htmlFor="inventory-search" className="sr-only">Buscar productos</label>
              <input
                id="inventory-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, SKU o color"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none transition focus:border-[#5B0E2D] focus:ring-2 focus:ring-[#5B0E2D]/10"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50 sm:flex-none">
                Buscar
              </button>
              {appliedQuery && (
                <button type="button" onClick={clearSearch} disabled={loading} className="flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50 sm:flex-none">
                  Limpiar
                </button>
              )}
              {canManage && (
                <button type="button" onClick={openCreate} className="flex-1 rounded-xl bg-[#5B0E2D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2 sm:flex-none">
                  Nuevo
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div role="alert" className="m-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:m-6 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => loadProducts(appliedQuery)} className="self-start rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 sm:self-auto">
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div aria-live="polite" aria-busy="true" className="space-y-3 p-4 sm:p-6">
          <span className="sr-only">Cargando productos</span>
          {[0, 1, 2].map((row) => <div key={row} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div className="text-lg font-semibold text-slate-800">No hay productos para mostrar</div>
          <p className="mt-2 text-sm text-slate-500">Prueba otra búsqueda o crea el primer producto.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 p-4 md:hidden">
            {items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                canManage={canManage}
                canSell={canSell}
                canDelete={canDelete}
                onSell={openSale}
                onEdit={openEdit}
                onDelete={requestDelete}
              />
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-6 py-3">Producto</th>
                  <th scope="col" className="px-4 py-3">Categoría</th>
                  <th scope="col" className="px-4 py-3">Precio</th>
                  <th scope="col" className="px-4 py-3">Stock</th>
                  <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    canManage={canManage}
                    canSell={canSell}
                    canDelete={canDelete}
                    onSell={openSale}
                    onEdit={openEdit}
                    onDelete={requestDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showProductModal && (
        <ProductModal product={editing} onClose={closeProductModal} onSaved={productSaved} />
      )}

      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          busy={deleting}
          error={deleteError}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          onConfirm={deleteProduct}
        />
      )}

      {saleTarget && (
        <SaleDialog
          product={saleTarget}
          quantity={saleQuantity}
          error={saleError}
          busy={selling}
          onQuantityChange={(value) => { setSaleQuantity(value); setSaleError('') }}
          onCancel={() => setSaleTarget(null)}
          onSubmit={registerSale}
        />
      )}
    </section>
  )
}

function ProductRow({ product, canManage, canDelete, canSell, onSell, onEdit, onDelete }) {
  const sizes = parseSizes(product.sizes ?? product.size)
  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <ProductThumbnail product={product} />
          <div className="min-w-0">
            <div className="font-semibold text-slate-900">{product.name}</div>
            <div className="mt-0.5 text-xs text-slate-500">{product.brand || 'Sin marca'} · {product.sku}</div>
            <div className="mt-1 text-xs text-slate-400">{product.color || 'Sin color'} · {sizes.join(', ') || 'Sin talla'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-slate-600">{product.category}</td>
      <td className="px-4 py-4">
        <div className="font-semibold text-slate-900">{formatMoney(product.price)}</div>
        {product.onOffer && <div className="mt-1 text-xs font-semibold text-emerald-700">−{Number(product.discount) || 0}%</div>}
      </td>
      <td className="px-4 py-4"><StockBadge stock={product.stock} /></td>
      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          {canSell && Number(product.stock) > 0 && <ActionButton onClick={() => onSell(product)} label={`Registrar venta de ${product.name}`}>Vender</ActionButton>}
          {canManage && <ActionButton onClick={() => onEdit(product)} label={`Editar ${product.name}`}>Editar</ActionButton>}
          {canDelete && <ActionButton danger onClick={() => onDelete(product)} label={`Eliminar ${product.name}`}>Eliminar</ActionButton>}
        </div>
      </td>
    </tr>
  )
}

function ProductCard({ product, canManage, canDelete, canSell, onSell, onEdit, onDelete }) {
  const sizes = parseSizes(product.sizes ?? product.size)
  return (
    <article className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <ProductThumbnail product={product} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{product.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{product.brand || 'Sin marca'} · {product.sku}</p>
          <p className="mt-1 text-xs text-slate-500">{product.color} · {sizes.join(', ') || 'Sin talla'}</p>
        </div>
        <StockBadge stock={product.stock} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <div className="text-xs text-slate-500">{product.category}</div>
          <div className="font-bold text-slate-950">{formatMoney(product.price)}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canSell && Number(product.stock) > 0 && <ActionButton onClick={() => onSell(product)} label={`Registrar venta de ${product.name}`}>Vender</ActionButton>}
          {canManage && <ActionButton onClick={() => onEdit(product)} label={`Editar ${product.name}`}>Editar</ActionButton>}
          {canDelete && <ActionButton danger onClick={() => onDelete(product)} label={`Eliminar ${product.name}`}>Eliminar</ActionButton>}
        </div>
      </div>
    </article>
  )
}

function ProductThumbnail({ product }) {
  const [failed, setFailed] = useState(false)
  const source = resolveImageUrl(product.image)

  useEffect(() => setFailed(false), [source])

  if (!source || failed) {
    return <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-bold text-slate-400">WF</div>
  }
  return <img src={source} onError={() => setFailed(true)} alt={`Miniatura de ${product.name}`} className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" />
}

function StockBadge({ stock }) {
  const value = Number(stock) || 0
  const color = value === 0 ? 'bg-red-100 text-red-700' : value < 10 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{value} uds.</span>
}

function ActionButton({ children, label, danger = false, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 ${danger ? 'text-red-700 hover:bg-red-50 focus-visible:ring-red-600' : 'text-slate-700 hover:bg-slate-100 focus-visible:ring-[#5B0E2D]'}`}>
      {children}
    </button>
  )
}

function DeleteDialog({ product, busy, error, onCancel, onConfirm }) {
  const cancelRef = useRef(null)
  return (
    <Dialog title="Eliminar producto" description={`Esta acción eliminará “${product.name}” del inventario y no se puede deshacer.`} busy={busy} onClose={onCancel} initialFocusRef={cancelRef}>
      {error && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50">Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={busy} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? 'Eliminando…' : 'Eliminar producto'}
        </button>
      </div>
    </Dialog>
  )
}

function SaleDialog({ product, quantity, error, busy, onQuantityChange, onCancel, onSubmit }) {
  const inputRef = useRef(null)
  return (
    <Dialog title="Registrar venta" description={`${product.name} · ${product.stock} unidades disponibles.`} busy={busy} onClose={onCancel} initialFocusRef={inputRef}>
      <form onSubmit={onSubmit} className="mt-5">
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <label htmlFor="sale-quantity" className="text-sm font-semibold text-slate-800">Cantidad</label>
        <input ref={inputRef} id="sale-quantity" type="number" min="1" max={product.stock} step="1" inputMode="numeric" value={quantity} onChange={(event) => onQuantityChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby="sale-quantity-hint" className="mt-2 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#5B0E2D] focus:ring-2 focus:ring-[#5B0E2D]/10" />
        <p id="sale-quantity-hint" className="mt-1.5 text-xs text-slate-500">El stock se descontará cuando la venta sea confirmada.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={busy || Number(product.stock) < 1} className="rounded-xl bg-[#5B0E2D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Registrando…' : 'Confirmar venta'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

function Dialog({ title, description, busy, onClose, initialFocusRef, children }) {
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef(onClose)
  const busyRef = useRef(busy)
  const dialogRef = useRef(null)
  closeRef.current = onClose
  busyRef.current = busy

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => initialFocusRef.current?.focus(), 0)
    function handleKeyDown(event) {
      trapFocus(event, dialogRef.current)
      if (event.key === 'Escape' && !busyRef.current) closeRef.current?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [initialFocusRef])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 id={titleId} className="text-xl font-bold text-slate-950">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children}
      </section>
    </div>
  )
}
