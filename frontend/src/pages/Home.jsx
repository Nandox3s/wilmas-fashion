import Hero from '../components/Hero'
import FeaturedProducts from '../components/FeaturedProducts'
import Promotions from '../components/Promotions'

export default function Home(){
  return (
    <div className="min-h-screen bg-[#f8f3ef] font-sans">
      <main>
        <Hero />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <FeaturedProducts />
          <Promotions />
        </div>
      </main>
    </div>
  )
}
