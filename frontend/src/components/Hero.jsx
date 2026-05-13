import React from 'react'
import { motion } from 'framer-motion'

export default function Hero(){
  return (
    <section className="relative bg-gradient-to-br from-vino/80 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-1">
          <motion.h1 initial={{x:-30, opacity:0}} animate={{x:0, opacity:1}} className="text-4xl md:text-6xl font-extrabold leading-tight">Descubre la nueva colección
            <span className="block text-gold text-lg mt-3">Lujo minimalista · Edición 2026</span>
          </motion.h1>
          <motion.p initial={{x:-20, opacity:0}} animate={{x:0, opacity:1}} transition={{delay:0.1}} className="mt-6 text-gray-100 max-w-xl">Prendas seleccionadas con materiales premium y diseño futurista. Calidad y estilo que trascienden tendencias.</motion.p>
          <motion.div initial={{y:10, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2}} className="mt-8">
            <button className="btn-primary px-6 py-3 rounded-lg shadow">Comprar ahora</button>
            <button className="ml-4 px-4 py-3 rounded-lg border text-white/90">Explorar</button>
          </motion.div>
        </div>
        <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="flex-1">
          <div className="bg-white/5 p-6 rounded-2xl glass">
            <img src="/src/assets/hero-model.jpg" alt="model" className="w-full max-h-[520px] object-cover rounded-lg shadow-soft" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
