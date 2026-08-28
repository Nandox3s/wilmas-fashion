export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

export function validateCheckout(form) {
  const errors = {}
  const requiredText = [
    ['firstName', 'Escribe tu nombre.', 2],
    ['lastName', 'Escribe tu apellido.', 2],
    ['address', 'Escribe una dirección válida.', 5],
    ['city', 'Escribe tu ciudad.', 2],
    ['province', 'Escribe tu provincia o departamento.', 2],
    ['identificationNumber', 'Escribe tu identificación.', 5],
    ['billingIdentificationNumber', 'Escribe la identificación para facturación.', 5],
  ]

  requiredText.forEach(([field, message, minLength]) => {
    if (String(form[field] || '').trim().length < minLength) errors[field] = message
  })

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || '').trim())) {
    errors.email = 'Escribe un correo válido.'
  }

  if (form.billingEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.billingEmail || '').trim())) {
    errors.billingEmail = 'Escribe un correo de facturación válido.'
  }

  if (String(form.billingName || '').trim().length < 2) {
    errors.billingName = 'Escribe nombres o razón social de facturación.'
  }

  if (!form.billingSameAsShipping && String(form.billingAddress || '').trim().length < 5) {
    errors.billingAddress = 'Escribe una dirección de facturación válida.'
  }

  const phone = onlyDigits(form.phone)
  if (phone.length < 7 || phone.length > 15) {
    errors.phone = 'Usa entre 7 y 15 dígitos.'
  }

  if (String(form.reference || '').length > 160) {
    errors.reference = 'La referencia debe tener máximo 160 caracteres.'
  }

  if (!form.deliveryMethod) errors.deliveryMethod = 'Elige un método de entrega.'
  if (!['cash_on_delivery', 'paypal'].includes(form.paymentMethod)) errors.paymentMethod = 'Elige un método de pago válido.'

  return errors
}
