import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/cart'

export default function CartSummary({ pricing, shipping = pricing.standardShipping, ctaTo, ctaLabel = 'Continuar al checkout', onSubmit, formId, disabled = false, processing = false, hideCta = false, children }) {
  const total = pricing.subtotal + shipping
  const buttonClasses = 'button-primary mt-5 w-full'

  return (
    <aside className="rounded-[1.5rem] bg-[#24131b] p-5 text-white shadow-[0_24px_70px_rgba(36,19,27,0.2)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e6c875]">Tu pedido</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold">Resumen</h2>
        </div>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 text-[#e6c875]" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6m-6 4h6"/></svg>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4 text-white/75">
          <dt>Productos</dt>
          <dd>{formatCurrency(pricing.merchandiseSubtotal)}</dd>
        </div>
        {pricing.discountTotal > 0 && (
          <div className="flex justify-between gap-4 text-[#e8c978]">
            <dt>Descuentos</dt>
            <dd>−{formatCurrency(pricing.discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 text-white/75">
          <dt>Envío</dt>
          <dd>{shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</dd>
        </div>
        <div className="flex items-end justify-between gap-4 border-t border-white/[0.12] pt-4">
          <dt className="font-bold">Total</dt>
          <dd className="font-serif text-3xl font-semibold text-[#f0d381]">{formatCurrency(total)}</dd>
        </div>
      </dl>

      {children}

      {!hideCta && (ctaTo ? (
        <Link to={ctaTo} className={buttonClasses}>{ctaLabel}</Link>
      ) : (
        <button type="submit" form={formId} onClick={onSubmit} disabled={disabled || processing} className={buttonClasses}>
          {processing ? (
            <><span className="spinner" aria-hidden="true" /> Procesando…</>
          ) : ctaLabel}
        </button>
      ))}

      <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-white/60">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"/></svg>
        Tus datos personales se transmiten de forma segura.
      </p>
    </aside>
  )
}
