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
  const update = (field, value, markTouched = false) => onChange(field, value, markTouched)

  return (
    <div className="space-y-5">
      <section className="checkout-section">
        <SectionHeading step="1" title="Datos de contacto" copy="Usaremos estos datos para mantenerte informado sobre tu pedido." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Nombre" value={form.firstName} onChange={(event) => update('firstName', event.target.value)} onBlur={() => update('firstName', form.firstName, true)} error={visibleError('firstName')} autoComplete="given-name" />
          <Field id="lastName" label="Apellido" value={form.lastName} onChange={(event) => update('lastName', event.target.value)} onBlur={() => update('lastName', form.lastName, true)} error={visibleError('lastName')} autoComplete="family-name" />
          <Field id="email" type="email" label="Correo electrónico" value={form.email} onChange={(event) => update('email', event.target.value)} onBlur={() => update('email', form.email, true)} error={visibleError('email')} autoComplete="email" inputMode="email" />
          <Field id="phone" type="tel" label="Teléfono" value={form.phone} onChange={(event) => update('phone', event.target.value)} onBlur={() => update('phone', form.phone, true)} error={visibleError('phone')} autoComplete="tel" inputMode="tel" placeholder="Ej. 300 123 4567" />
          <Field id="identificationNumber" label="Identificación" value={form.identificationNumber} onChange={(event) => update('identificationNumber', event.target.value)} onBlur={() => update('identificationNumber', form.identificationNumber, true)} error={visibleError('identificationNumber')} inputMode="numeric" placeholder="Cédula o identificación" />
        </div>
      </section>

      <section className="checkout-section">
        <SectionHeading step="2" title="Datos de facturación" copy="Usaremos estos datos para emitir tu factura electrónica." />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="billingIdentificationType" className="field-label">Tipo de identificación</label>
            <select
              id="billingIdentificationType"
              value={form.billingIdentificationType}
              onChange={(event) => update('billingIdentificationType', event.target.value)}
              className="input-field mt-2"
            >
              <option value="CEDULA">Cédula</option>
              <option value="RUC">RUC</option>
              <option value="PASSPORT">Pasaporte</option>
            </select>
          </div>
          <Field id="billingIdentificationNumber" label="Número de identificación" value={form.billingIdentificationNumber} onChange={(event) => update('billingIdentificationNumber', event.target.value)} onBlur={() => update('billingIdentificationNumber', form.billingIdentificationNumber, true)} error={visibleError('billingIdentificationNumber')} />
          <Field id="billingName" label="Nombres / Razón social" value={form.billingName} onChange={(event) => update('billingName', event.target.value)} onBlur={() => update('billingName', form.billingName, true)} error={visibleError('billingName')} className="sm:col-span-2" />
          <Field id="billingEmail" type="email" label="Correo de facturación" value={form.billingEmail} onChange={(event) => update('billingEmail', event.target.value)} onBlur={() => update('billingEmail', form.billingEmail, true)} error={visibleError('billingEmail')} />
          <Field id="billingPhone" type="tel" label="Teléfono de facturación" value={form.billingPhone} onChange={(event) => update('billingPhone', event.target.value)} onBlur={() => update('billingPhone', form.billingPhone, true)} error={visibleError('billingPhone')} />
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-[#5f4d54]">
            <input type="checkbox" checked={Boolean(form.billingSameAsShipping)} onChange={(event) => update('billingSameAsShipping', event.target.checked)} />
            La dirección de facturación es igual a la de envío
          </label>
          {!form.billingSameAsShipping && (
            <Field id="billingAddress" label="Dirección de facturación" value={form.billingAddress} onChange={(event) => update('billingAddress', event.target.value)} onBlur={() => update('billingAddress', form.billingAddress, true)} error={visibleError('billingAddress')} className="sm:col-span-2" />
          )}
        </div>
      </section>

      <section className="checkout-section">
        <SectionHeading step="3" title="Dirección de entrega" copy="Completa los datos como te gustaría verlos en la guía." />
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
        <SectionHeading step="4" title="Método de entrega" />
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
        <SectionHeading step="5" title="Método de pago" />
        <fieldset aria-describedby={visibleError('paymentMethod') ? 'payment-error' : undefined}>
          <legend className="sr-only">Elige un método de pago</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { id: 'cash_on_delivery', name: 'Pago al recibir', copy: 'Paga al momento de recibir tu pedido.' },
              { id: 'paypal', name: 'PayPal', copy: 'Paga de forma segura con tu cuenta PayPal.' },
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

      </section>
    </div>
  )
}
