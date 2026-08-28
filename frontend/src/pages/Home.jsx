import { useEffect, useState } from 'react'
import Hero from '../components/Hero'
import FeaturedProducts from '../components/FeaturedProducts'
import Promotions from '../components/Promotions'
import { loadCatalogProducts } from '../services/productService'

export default function Home(){
  const [products, setProducts] = useState([])
  const [catalogError, setCatalogError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  useEffect(() => { let active = true; loadCatalogProducts().then((result) => { if (active) { setProducts(result.products); setCatalogError(result.source === 'unavailable') } }); return () => { active = false } }, [reloadKey])
  return (
    <div className="min-h-screen bg-[#f8f3ef] font-sans">
      <main>
        <Hero products={products} />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          {catalogError ? (
            <section className="rounded-[2rem] border border-[#a86c27]/20 bg-white px-5 py-12 text-center" role="alert">
              <h2 className="font-serif text-3xl font-semibold text-[#28161e]">No pudimos mostrar los productos.</h2>
              <p className="mt-3 text-[#705d65]">Revisa tu conexión e intenta nuevamente.</p>
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="button-primary mt-6">Reintentar</button>
            </section>
          ) : <><FeaturedProducts products={products} /><Promotions products={products} /></>}
        </div>
      </main>
    </div>
  )
}
