import React, { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import FeaturedProducts from '../components/FeaturedProducts'
import Promotions from '../components/Promotions'
import Footer from '../components/Footer'

export default function Home(){
  return (
    <div className="min-h-screen bg-soft-gray font-sans">
      <Navbar />
      <main>
        <Hero />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <FeaturedProducts />
          <Promotions />
        </div>
      </main>
      <Footer />
    </div>
  )
}
