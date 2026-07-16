import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react'
import {
  CART_STORAGE_KEY,
  addCartItem,
  calculateCartPricing,
  createLineId,
  normalizeCartItem,
  setCartItemQuantity,
} from '../utils/cart'

const CartContext = createContext(null)

function loadCart() {
  if (typeof window === 'undefined') return []

  try {
    const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    return stored.map(normalizeCartItem).filter(Boolean)
  } catch {
    return []
  }
}

function cartReducer(items, action) {
  switch (action.type) {
    case 'add':
      return addCartItem(items, action.product, action.options)
    case 'quantity':
      return setCartItemQuantity(items, action.lineId, action.quantity)
    case 'remove':
      return items.filter((item) => item.lineId !== action.lineId)
    case 'clear':
      return []
    default:
      return items
  }
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe utilizarse dentro de CartProvider')
  return context
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart)

  useEffect(() => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((product, options = {}) => {
    dispatch({ type: 'add', product, options })
  }, [])

  const add = useCallback((product, quantity = 1) => {
    dispatch({
      type: 'add',
      product,
      options: {
        quantity,
        color: product?.color || '',
        size: Array.isArray(product?.sizes) && product.sizes.length === 1 ? product.sizes[0] : '',
      },
    })
  }, [])

  const updateQuantity = useCallback((lineId, quantity) => {
    dispatch({ type: 'quantity', lineId, quantity })
  }, [])

  const removeItem = useCallback((lineId) => {
    dispatch({ type: 'remove', lineId })
  }, [])

  const clearCart = useCallback(() => dispatch({ type: 'clear' }), [])

  const getLineQuantity = useCallback((productId, size = '', color = '') => {
    const lineId = createLineId(productId, size, color)
    return items.find((item) => item.lineId === lineId)?.quantity || 0
  }, [items])

  const pricing = useMemo(() => calculateCartPricing(items), [items])
  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  )

  const value = useMemo(() => ({
    items,
    itemCount,
    pricing,
    addItem,
    add,
    updateQuantity,
    updateQty: updateQuantity,
    removeItem,
    remove: removeItem,
    clearCart,
    clear: clearCart,
    getLineQuantity,
    total: pricing.subtotal,
  }), [
    items,
    itemCount,
    pricing,
    addItem,
    add,
    updateQuantity,
    removeItem,
    clearCart,
    getLineQuantity,
  ])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export default CartContext
