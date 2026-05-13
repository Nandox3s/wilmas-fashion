import React, { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext()

export function useCart(){ return useContext(CartContext) }

export function CartProvider({ children }){
  const [items, setItems] = useState(() => {
    try{ return JSON.parse(localStorage.getItem('wf_cart')||'[]') }catch(e){return []}
  })

  useEffect(()=>{ localStorage.setItem('wf_cart', JSON.stringify(items)) }, [items])

  function add(product, qty=1){
    setItems(prev=>{
      const found = prev.find(p=>p.id===product.id)
      if(found) return prev.map(p=> p.id===product.id? {...p, qty: p.qty+qty} : p)
      return [...prev, {...product, qty}]
    })
  }
  function remove(id){ setItems(prev=> prev.filter(p=>p.id!==id)) }
  function updateQty(id, qty){ setItems(prev=> prev.map(p=> p.id===id? {...p, qty} : p)) }
  function clear(){ setItems([]) }
  const total = items.reduce((s,p)=> s + (p.price||0)*p.qty, 0)

  return <CartContext.Provider value={{items, add, remove, updateQty, clear, total}}>{children}</CartContext.Provider>
}

export default CartContext
