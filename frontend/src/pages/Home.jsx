import { useEffect, useState } from 'react'
import Hero from '../components/Hero'
import FeaturedProducts from '../components/FeaturedProducts'
import Promotions from '../components/Promotions'
import { loadCatalogProducts } from '../services/productService'

export default function Home(){
  const [products, setProducts] = useState([])
  useEffect(() => { let active = true; loadCatalogProducts().then((result) => { if (active) setProducts(result.products) }); return () => { active = false } }, [])
  return (
    <div className="min-h-screen bg-[#f8f3ef] font-sans">
      <main>
        <Hero products={products} />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <FeaturedProducts products={products} />
          <Promotions products={products} />
        </div>
      </main>
    </div>
  )
}
