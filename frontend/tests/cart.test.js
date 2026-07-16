import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addCartItem,
  calculateCartPricing,
  createLineId,
  normalizeCartItem,
  parseSizes,
  setCartItemQuantity,
} from '../src/utils/cart.js'

const product = {
  id: 'palazo',
  name: 'Palazo',
  brand: 'Wilmas',
  color: 'Rojo',
  price: 20,
  discount: 10,
  stock: 4,
}

test('normaliza tallas desde arrays, JSON y valores separados por coma', () => {
  assert.deepEqual(parseSizes(['S', 'M', 'M']), ['S', 'M'])
  assert.deepEqual(parseSizes('["S","L"]'), ['S', 'L'])
  assert.deepEqual(parseSizes('S, M, XL'), ['S', 'M', 'XL'])
})
test('fusiona solo la misma combinación de producto, talla y color', () => {
  let items = addCartItem([], product, { size: 'S', color: 'Rojo', quantity: 1 })
  items = addCartItem(items, product, { size: 'S', color: 'Rojo', quantity: 2 })
  items = addCartItem(items, product, { size: 'M', color: 'Rojo', quantity: 1 })
  items = addCartItem(items, { ...product, color: 'Negro' }, { size: 'S', color: 'Negro', quantity: 1 })

  assert.equal(items.length, 3)
  assert.equal(items.find((item) => item.lineId === createLineId('palazo', 'S', 'Rojo')).quantity, 3)
})

test('limita cantidades entre uno y el stock disponible', () => {
  let items = addCartItem([], product, { size: 'S', color: 'Rojo', quantity: 10 })
  assert.equal(items[0].quantity, 4)

  items = setCartItemQuantity(items, items[0].lineId, 0)
  assert.equal(items[0].quantity, 1)

  items = setCartItemQuantity(items, items[0].lineId, 99)
  assert.equal(items[0].quantity, 4)
})

test('migra una línea heredada con qty sin perder la selección', () => {
  const item = normalizeCartItem({ ...product, qty: 2, size: 'M' })
  assert.equal(item.quantity, 2)
  assert.equal(item.lineId, createLineId('palazo', 'M', 'Rojo'))
})

test('calcula subtotal, descuento, envío y total', () => {
  const items = [normalizeCartItem({ ...product, quantity: 2, stock: 5 })]
  const pricing = calculateCartPricing(items)

  assert.equal(pricing.merchandiseSubtotal, 40)
  assert.equal(pricing.discountTotal, 4)
  assert.equal(pricing.subtotal, 36)
  assert.equal(pricing.standardShipping, 5.9)
  assert.equal(pricing.total, 41.9)

  const freeShipping = calculateCartPricing([
    normalizeCartItem({ ...product, price: 100, discount: 0, quantity: 1, stock: 1 }),
  ])
  assert.equal(freeShipping.standardShipping, 0)
})
