import React from 'react'
import { formatCardNumber, formatExpiry, onlyDigits } from '../utils/checkout'
import { formatCurrency } from '../utils/cart'

function Field({ id, label, error, hint, className = '', ...inputProps }) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : '', error ? errorId : ''].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">{label}</label>
      <input
        id={id}
        name={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`input-field mt-2 ${error ? 'border-[#b52e50] ring-2 ring-[#b52e50]/10' : ''}`}
        {...inputProps}
      />
      {hint && <p id={hintId} className="mt-1.5 text-xs leading-5 text-[#806e75]">{hint}</p>}
      {error && <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-[#aa294b]">{error}</p>}
    </div>
  )
}

function SectionHeading({ step, title, copy }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#6d1738] text-sm font-extrabold text-white">{step}</span>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-[#28161e]">{title}</h2>
        {copy && <p className="mt-1 text-sm leading-6 text-[#705d65]">{copy}</p>}
      </div>
    </div>
  )
}

export default function CheckoutForm({ form, errors, touched, onChange, deliveryOptions }) {
  const visibleError = (field) => touched[field] ? errors[field] : ''
  const update = (field, value) => onChange(field, value)
  const cardDigits = onlyDigits(form.cardNumber).padEnd(16, '•')
  const cardDisplay = cardDigits.match(/.{1,4}/g)?.join(' ') || '•••• •••• •••• ••••'

  return (
    <div className="space-y-5">
      <section className="checkout-section">
        <SectionHeading step="1" title="Datos de contacto" copy="Los usaremos únicamente para coordinar esta demostración de pedido." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Nombre" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} onBlur={() => update('firstName', form.firstName, true)} error={visibleError('firstName')} autoComplete="given-name" />
          <Field id="lastName" label="Apellido" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} onBlur={() => update('lastName', form.lastName, true)} error={visibleError('lastName')} autoComplete="family-name" />
          <Field id="email" type="email" label="Correo electrónico" value={form.email} onChange={(event) => update('email', event.target.value)} onBlur={() => update('email', form.email, true)} error={visibleError('email')} autoComplete="email" inputMode="email" />
          <Field id="phone" type="tel" label="Teléfono" value={form.phone} onChange={(event) => update('phone', event.target.value)} onBlur={() => update('phone', form.phone, true)} error={visibleError('phone')} autoComplete="tel" inputMode="tel" placeholder="Ej. 300 123 4567" />
          <Field id="identificationNumber" label="Identificación" value={form.identificationNumber} onChange={(event) => update('identificationNumber', event.target.value)} onBlur={() => update('identificationNumber', form.identificationNumber, true)} error={visibleError('identificationNumber')} inputMode="numeric" placeholder="Cédula o identificación" />
        </div>
      </section>

      <section className="checkout-section">
        <SectionHeading step="2" title="Dirección de entrega" copy="Completa los datos como te gustaría verlos en la guía." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="address" label="Dirección" value={form.address} onChange={(event) => update('address', event.target.value)} onBlur={() => update('address', form.address, true)} error={visibleError('address')} autoComplete="street-address" className="sm:col-span-2" placeholder="Calle, carrera, número y complemento" />
          <Field id="city" label="Ciudad" value={form.city} onChange={(event) => update('city', event.target.value)} onBlur={() => update('city', form.city, true)} error={visibleError('city')} autoComplete="address-level2" />
          <Field id="province" label="Provincia / departamento" value={form.province} onChange={(event) => update('province', event.target.value)} onBlur={() => update('province', form.province, true)} error={visibleError('province')} autoComplete="address-level1" />
          <div className="sm:col-span-2">
            <label htmlFor="reference" className="field-label">Referencia de entrega <span className="font-normal text-[#806e75]">(opcional)</span></label>
            <textarea
              id="reference"
              name="reference"
              value={form.reference}
              onChange={(event) => update('reference', event.target.value)}
              onBlur={() => update('reference', form.reference, true)}
              aria-invalid={Boolean(visibleError('reference'))}
              aria-describedby={visibleError('reference') ? 'reference-error' : undefined}
              rows="3"
              maxLength="160"
              className="input-field mt-2 resize-y"
              placeholder="Edificio, indicaciones o punto de referencia"
            />
            <div className="mt-1.5 flex justify-between gap-3 text-xs text-[#806e75]">
              <span id="reference-error" className="text-[#aa294b]">{visibleError('reference')}</span>
              <span>{form.reference.length}/160</span>
            </div>
          </div>
        </div>
      </section>

      <section className="checkout-section">
        <SectionHeading step="3" title="Método de entrega" />
        <fieldset aria-describedby={visibleError('deliveryMethod') ? 'delivery-error' : undefined}>
          <legend className="sr-only">Elige un método de entrega</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {deliveryOptions.map((option) => (
              <label key={option.id} className={`relative cursor-pointer rounded-2xl border p-4 transition ${form.deliveryMethod === option.id ? 'border-[#6d1738] bg-[#fbf3f6] ring-2 ring-[#6d1738]/10' : 'border-[#39232c]/[0.12] bg-white hover:border-[#6d1738]/35'}`}>
                <input type="radio" name="deliveryMethod" value={option.id} checked={form.deliveryMethod === option.id} onChange={() => update('deliveryMethod', option.id, true)} className="sr-only" />
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block font-bold text-[#3b2530]">{option.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#76636b]">{option.copy}</span>
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-[#4f102b]">{option.price === 0 ? 'Gratis' : formatCurrency(option.price)}</span>
                </span>
              </label>
            ))}
          </div>
          {visibleError('deliveryMethod') && <p id="delivery-error" role="alert" className="mt-2 text-sm font-medium text-[#aa294b]">{visibleError('deliveryMethod')}</p>}
        </fieldset>
      </section>

      <section className="checkout-section">
        <SectionHeading step="4" title="Método de pago" copy="Este proyecto no tiene pasarela bancaria. Ninguna opción genera un cobro real." />
        <div className="rounded-2xl border border-[#a86c27]/25 bg-[#fff8e8] p-4 text-sm leading-6 text-[#70501f]" role="note">
          <strong>Modo demostración:</strong> los datos solo se validan en memoria y se descartan al terminar. No se envían al backend ni se guardan en localStorage.
        </div>
        <fieldset className="mt-4" aria-describedby={visibleError('paymentMethod') ? 'payment-error' : undefined}>
          <legend className="sr-only">Elige un método de pago</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'card', name: 'Tarjeta de demostración', copy: 'Validación visual, sin cargo bancario.' },
              { id: 'delivery', name: 'Pago al recibir', copy: 'Opción ilustrativa para el flujo demo.' },
            ].map((option) => (
              <label key={option.id} className={`cursor-pointer rounded-2xl border p-4 transition ${form.paymentMethod === option.id ? 'border-[#6d1738] bg-[#fbf3f6] ring-2 ring-[#6d1738]/10' : 'border-[#39232c]/[0.12] bg-white hover:border-[#6d1738]/35'}`}>
                <input type="radio" name="paymentMethod" value={option.id} checked={form.paymentMethod === option.id} onChange={() => update('paymentMethod', option.id, true)} className="sr-only" />
                <span className="block font-bold text-[#3b2530]">{option.name}</span>
                <span className="mt-1 block text-xs leading-5 text-[#76636b]">{option.copy}</span>
              </label>
            ))}
          </div>
          {visibleError('paymentMethod') && <p id="payment-error" role="alert" className="mt-2 text-sm font-medium text-[#aa294b]">{visibleError('paymentMethod')}</p>}
        </fieldset>

        {form.paymentMethod === 'card' && (
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative min-h-52 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(145deg,#6d1738,#2a131d)] p-5 text-white shadow-[0_20px_50px_rgba(60,15,34,0.24)]" aria-label="Vista previa de tarjeta de demostración">
              <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full border border-white/10" />
              <div className="absolute -right-5 -top-5 h-32 w-32 rounded-full bg-[#d4af37]/[0.12]" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xl font-semibold">Wilmas</span>
                  <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f0d381]">Demo</span>
                </div>
                <p className="mt-10 font-mono text-lg tracking-[0.12em] sm:text-xl">{cardDisplay}</p>
                <div className="mt-7 flex items-end justify-between gap-4 text-xs uppercase tracking-[0.12em] text-white/60">
                  <span className="min-w-0 truncate"><small className="block text-[9px]">Titular</small><strong className="mt-1 block truncate text-white">{form.cardName || 'TU NOMBRE'}</strong></span>
                  <span className="shrink-0"><small className="block text-[9px]">Vence</small><strong className="mt-1 block text-white">{form.expiry || 'MM/AA'}</strong></span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="cardName" label="Nombre del titular" value={form.cardName} onChange={(event) => update('cardName', event.target.value)} onBlur={() => update('cardName', form.cardName, true)} error={visibleError('cardName')} autoComplete="cc-name" className="sm:col-span-2" />
              <Field id="cardNumber" label="Número de tarjeta" value={form.cardNumber} onChange={(event) => update('cardNumber', formatCardNumber(event.target.value))} onBlur={() => update('cardNumber', form.cardNumber, true)} error={visibleError('cardNumber')} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" maxLength="19" className="sm:col-span-2" hint="Puedes usar 4242 4242 4242 4242 para probar." />
              <Field id="expiry" label="Vencimiento" value={form.expiry} onChange={(event) => update('expiry', formatExpiry(event.target.value))} onBlur={() => update('expiry', form.expiry, true)} error={visibleError('expiry')} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" maxLength="5" />
              <Field id="cvv" type="password" label="CVV" value={form.cvv} onChange={(event) => update('cvv', onlyDigits(event.target.value).slice(0, 4))} onBlur={() => update('cvv', form.cvv, true)} error={visibleError('cvv')} inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength="4" />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
