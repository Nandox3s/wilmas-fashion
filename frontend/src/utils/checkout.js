export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}
export function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export function formatExpiry(value) {
  const digits = onlyDigits(value).slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits
}

export function passesLuhn(value) {
  const digits = onlyDigits(value)
  if (digits.length < 13) return false

  let sum = 0
  let doubleDigit = false
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index])
    if (doubleDigit) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    doubleDigit = !doubleDigit
  }
  return sum % 10 === 0
}

export function isValidExpiry(value, now = new Date()) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  return year > currentYear || (year === currentYear && month >= currentMonth)
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
  if (!form.paymentMethod) errors.paymentMethod = 'Elige un método de pago.'

  if (form.paymentMethod === 'card') {
    if (String(form.cardName || '').trim().length < 3) {
      errors.cardName = 'Escribe el nombre tal como aparece en la tarjeta.'
    }
    if (onlyDigits(form.cardNumber).length !== 16 || !passesLuhn(form.cardNumber)) {
      errors.cardNumber = 'Usa un número de tarjeta de demostración válido.'
    }
    if (!isValidExpiry(form.expiry)) {
      errors.expiry = 'Usa una fecha vigente en formato MM/AA.'
    }
    if (!/^\d{3,4}$/.test(onlyDigits(form.cvv))) {
      errors.cvv = 'Usa 3 o 4 dígitos.'
    }
  }

  return errors
}
