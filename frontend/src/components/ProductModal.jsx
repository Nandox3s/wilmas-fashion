import { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '',
  sku: '',
  brand: '',
  category: '',
  sizes: '',
  color: '',
  price: '',
  discount: '0',
  onOffer: false,
  stock: '',
  image: ''
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function sizesToInput(value) {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value !== 'string') return ''

  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed.join(', ') : trimmed
  } catch {
    return trimmed
  }
}

function parseSizes(value) {
  const values = String(value || '')
    .split(',')
    .map((size) => size.trim())
    .filter(Boolean)

  return [...new Set(values)]
}

function resolveImageUrl(image) {
  if (!image) return ''
  if (/^https?:\/\//i.test(image) || image.startsWith('blob:') || image.startsWith('data:')) return image
  if (image.startsWith('/img_wf/')) return image

  const path = image.startsWith('/') ? image : `/uploads/${image}`
  const apiBase = axios.defaults.baseURL
  return apiBase && /^https?:\/\//i.test(apiBase)
    ? `${apiBase.replace(/\/$/, '')}${path}`
    : path
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

export default function ProductModal({ product, onClose, onSaved }) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const nameInputRef = useRef(null)
  const closeRef = useRef(onClose)
  const submittingRef = useRef(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  closeRef.current = onClose
  submittingRef.current = submitting

  useEffect(() => {
    setForm(product ? {
      name: product.name || '',
      sku: product.sku || '',
      brand: product.brand || '',
      category: product.category || '',
      sizes: sizesToInput(product.sizes ?? product.size),
      color: product.color || '',
      price: product.price ?? '',
      discount: product.discount ?? 0,
      onOffer: Boolean(product.onOffer),
      stock: product.stock ?? '',
      image: product.image || ''
    } : EMPTY_FORM)
    setFile(null)
    setFieldErrors({})
    setError('')
  }, [product])

  useEffect(() => {
    if (!file) {
      setFilePreview('')
      return undefined
    }

    const preview = URL.createObjectURL(file)
    setFilePreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [file])

  useEffect(() => {
    const previousFocus = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => nameInputRef.current?.focus(), 0)

    function handleKeyDown(event) {
      trapFocus(event, dialogRef.current)
      if (event.key === 'Escape' && !submittingRef.current) closeRef.current?.()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus?.()
    }
  }, [])

  function updateField(event) {
    const { name, type, checked, value } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setFieldErrors((current) => ({ ...current, [name]: '' }))
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null
    if (!nextFile) {
      setFile(null)
      return
    }
    if (!nextFile.type.startsWith('image/')) {
      setFieldErrors((current) => ({ ...current, image: 'Selecciona un archivo de imagen válido.' }))
      event.target.value = ''
      return
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, image: 'La imagen no puede superar 5 MB.' }))
      event.target.value = ''
      return
    }
    setFieldErrors((current) => ({ ...current, image: '' }))
    setFile(nextFile)
  }

  function validate() {
    const errors = {}
    const sizes = parseSizes(form.sizes)
    const price = Number(form.price)
    const discount = Number(form.discount)
    const stock = Number(form.stock)

    if (!form.name.trim()) errors.name = 'El nombre es obligatorio.'
    if (!form.sku.trim()) errors.sku = 'El SKU es obligatorio.'
    if (!form.brand.trim()) errors.brand = 'La marca es obligatoria.'
    if (!form.category.trim()) errors.category = 'La categoría es obligatoria.'
    if (sizes.length === 0) errors.sizes = 'Añade al menos una talla.'
    if (!form.color.trim()) errors.color = 'El color es obligatorio.'
    if (!Number.isFinite(price) || price <= 0) errors.price = 'Ingresa un precio mayor que cero.'
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) errors.discount = 'Usa un descuento entre 0 y 100.'
    if (!Number.isInteger(stock) || stock < 0) errors.stock = 'El stock debe ser un entero igual o mayor que cero.'

    return {
      errors,
      payload: {
        name: form.name.trim(),
        sku: form.sku.trim(),
        brand: form.brand.trim(),
        category: form.category.trim(),
        sizes,
        color: form.color.trim(),
        price,
        discount,
        onOffer: form.onOffer,
        stock
      }
    }
  }

  async function uploadImage() {
    if (!file) return form.image
    const data = new FormData()
    data.append('file', file)
    const response = await axios.post('/api/upload', data, { headers: authHeaders() })
    return response.data?.url || response.data?.filename || ''
  }

  async function submit(event) {
    event.preventDefault()
    const { errors, payload } = validate()
    setFieldErrors(errors)
    setError('')

    if (Object.keys(errors).length > 0) {
      const firstField = Object.keys(errors)[0]
      window.setTimeout(() => document.getElementById(`product-${firstField}`)?.focus(), 0)
      return
    }

    setSubmitting(true)
    try {
      const image = await uploadImage()
      const body = { ...payload, image }
      const response = product
        ? await axios.put(`/api/products/${product.id}`, body, { headers: authHeaders() })
        : await axios.post('/api/products', body, { headers: authHeaders() })

      toast.success(product ? 'Producto actualizado' : 'Producto creado')
      if (onSaved) onSaved(response.data)
      else onClose?.(response.data)
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'No se pudo guardar el producto.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function closeFromBackdrop(event) {
    if (event.target === event.currentTarget && !submitting) onClose?.()
  }

  const preview = filePreview || resolveImageUrl(form.image)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-3 py-4 backdrop-blur-sm sm:px-6"
      onMouseDown={closeFromBackdrop}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5B0E2D]">Inventario</p>
            <h2 id={titleId} className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">
              {product ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-slate-500">
              Completa la información que verá el catálogo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClose?.()}
            disabled={submitting}
            aria-label="Cerrar formulario de producto"
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={submit} noValidate className="space-y-6 px-5 py-6 sm:px-7">
          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={fieldErrors.name} className="sm:col-span-2">
              <input ref={nameInputRef} id="product-name" name="name" value={form.name} onChange={updateField} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'product-name-error' : undefined} className={inputClass(fieldErrors.name)} />
            </Field>
            <Field label="SKU" error={fieldErrors.sku} errorId="product-sku-error">
              <input id="product-sku" name="sku" value={form.sku} onChange={updateField} aria-invalid={Boolean(fieldErrors.sku)} aria-describedby={fieldErrors.sku ? 'product-sku-error' : undefined} className={inputClass(fieldErrors.sku)} />
            </Field>
            <Field label="Marca" error={fieldErrors.brand} errorId="product-brand-error">
              <input id="product-brand" name="brand" value={form.brand} onChange={updateField} aria-invalid={Boolean(fieldErrors.brand)} aria-describedby={fieldErrors.brand ? 'product-brand-error' : undefined} className={inputClass(fieldErrors.brand)} />
            </Field>
            <Field label="Categoría" error={fieldErrors.category} errorId="product-category-error">
              <input id="product-category" name="category" value={form.category} onChange={updateField} aria-invalid={Boolean(fieldErrors.category)} aria-describedby={fieldErrors.category ? 'product-category-error' : undefined} className={inputClass(fieldErrors.category)} />
            </Field>
            <Field label="Color" error={fieldErrors.color} errorId="product-color-error">
              <input id="product-color" name="color" value={form.color} onChange={updateField} aria-invalid={Boolean(fieldErrors.color)} aria-describedby={fieldErrors.color ? 'product-color-error' : undefined} className={inputClass(fieldErrors.color)} />
            </Field>
            <Field label="Tallas" hint="Separadas por comas: S, M, L" error={fieldErrors.sizes} errorId="product-sizes-error" className="sm:col-span-2">
              <input id="product-sizes" name="sizes" value={form.sizes} onChange={updateField} aria-invalid={Boolean(fieldErrors.sizes)} aria-describedby={fieldErrors.sizes ? 'product-sizes-error' : 'product-sizes-hint'} className={inputClass(fieldErrors.sizes)} />
            </Field>
            <Field label="Precio" error={fieldErrors.price} errorId="product-price-error">
              <input id="product-price" name="price" type="number" min="0.01" step="0.01" inputMode="decimal" value={form.price} onChange={updateField} aria-invalid={Boolean(fieldErrors.price)} aria-describedby={fieldErrors.price ? 'product-price-error' : undefined} className={inputClass(fieldErrors.price)} />
            </Field>
            <Field label="Stock" error={fieldErrors.stock} errorId="product-stock-error">
              <input id="product-stock" name="stock" type="number" min="0" step="1" inputMode="numeric" value={form.stock} onChange={updateField} aria-invalid={Boolean(fieldErrors.stock)} aria-describedby={fieldErrors.stock ? 'product-stock-error' : undefined} className={inputClass(fieldErrors.stock)} />
            </Field>
            <Field label="Descuento (%)" error={fieldErrors.discount} errorId="product-discount-error">
              <input id="product-discount" name="discount" type="number" min="0" max="100" step="1" inputMode="numeric" value={form.discount} onChange={updateField} aria-invalid={Boolean(fieldErrors.discount)} aria-describedby={fieldErrors.discount ? 'product-discount-error' : undefined} className={inputClass(fieldErrors.discount)} />
            </Field>
            <div className="flex items-end">
              <label className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 focus-within:ring-2 focus-within:ring-[#5B0E2D]">
                <input name="onOffer" type="checkbox" checked={form.onOffer} onChange={updateField} className="h-4 w-4 accent-[#5B0E2D]" />
                Producto en oferta
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label htmlFor="product-image" className="text-sm font-semibold text-slate-800">Imagen</label>
            <p id="product-image-hint" className="mt-1 text-xs text-slate-500">JPG, PNG o WebP de máximo 5 MB.</p>
            <input id="product-image" type="file" accept="image/*" onChange={handleFileChange} aria-describedby={fieldErrors.image ? 'product-image-error' : 'product-image-hint'} aria-invalid={Boolean(fieldErrors.image)} className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-[#5B0E2D] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D]" />
            {fieldErrors.image && <p id="product-image-error" className="mt-2 text-xs font-medium text-red-600">{fieldErrors.image}</p>}
            {preview && (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-3 sm:flex-row sm:items-center">
                <img src={preview} alt="Vista previa del producto" className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{file?.name || form.image}</p>
                  <button type="button" onClick={() => { setFile(null); setForm((current) => ({ ...current, image: '' })) }} className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                    Quitar imagen
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => onClose?.()} disabled={submitting} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] disabled:cursor-not-allowed disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="rounded-2xl bg-[#5B0E2D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#74143b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B0E2D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Guardando…' : product ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function Field({ label, hint, error, errorId, className = '', children }) {
  const inputId = children.props.id
  const finalErrorId = errorId || `${inputId}-error`
  return (
    <div className={className}>
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-800">{label}</label>
      {hint && <p id={`${inputId}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && <p id={finalErrorId} className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

function inputClass(hasError) {
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:ring-2 ${hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-300 focus:border-[#5B0E2D] focus:ring-[#5B0E2D]/10'}`
}
