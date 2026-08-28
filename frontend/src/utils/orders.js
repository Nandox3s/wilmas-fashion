export function paymentMethod(order) {
  const providers = Array.isArray(order?.payments) ? order.payments.map((payment) => payment.provider) : []
  if (providers.includes('cash_on_delivery')) return 'cash_on_delivery'
  if (providers.includes('paypal')) return 'paypal'
  return null
}

export function paymentMethodLabel(order) {
  const method = paymentMethod(order)
  if (method === 'cash_on_delivery') return 'Pago al recibir'
  if (method === 'paypal') return 'PayPal'
  return 'Pendiente de selección'
}

export function orderStatusLabel(order) {
  if (paymentMethod(order) === 'cash_on_delivery' && order?.status === 'PENDING_PAYMENT') return 'Pendiente de pago al entregar'
  return order?.status || 'Sin estado'
}
