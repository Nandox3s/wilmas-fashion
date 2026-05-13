import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export default function Dashboard() {
  const [overview, setOverview] = useState(null)

  useEffect(()=>{
    const token = localStorage.getItem('token')
    axios.get('/api/stats/overview', { headers: { Authorization: `Bearer ${token}` } }).then(r=>setOverview(r.data)).catch(()=>{})
  },[])

  const chartData = {
    labels: ['Ene','Feb','Mar','Abr','May'],
    datasets: [{ label: 'Ventas', data: [12, 19, 8, 17, 14], borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,0.2)' }]
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 p-8">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Total productos</div>
            <div className="text-2xl font-bold">{overview?.totalProducts ?? '—'}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Ventas (simuladas)</div>
            <div className="text-2xl font-bold">{overview?.totalSales?._count?.id ?? 0}</div>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-500">Productos bajo stock</div>
            <div className="text-2xl font-bold">{overview?.lowStock?.length ?? 0}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Tendencia de ventas</h3>
            <Line data={chartData} />
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Productos con bajo stock</h3>
            <ul className="divide-y">
              {overview?.lowStock?.length ? overview.lowStock.map(p=> (
                <li key={p.id} className="py-2 flex justify-between items-center">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-sm text-gray-500">SKU: {p.sku} — Stock: {p.stock}</div>
                  </div>
                </li>
              )): <li className="py-2 text-sm text-gray-500">No hay productos con bajo stock</li>}
            </ul>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Listado de productos</h3>
          <div>
            <React.Suspense fallback={<div>Loading...</div>}>
              <ProductTableLazy />
            </React.Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProductTableLazy = React.lazy(() => import('../components/ProductTable'))
