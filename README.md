# Wilmas Fashion — Prototipo (Avance)

Avance funcional para la tienda "Wilmas Fashion" — prototipo universitario.

Stack:
- Frontend: React + Vite + TailwindCSS
- Backend: Node.js + Express + Prisma (MySQL)
- Autenticación: JWT

Estructura inicial creada:
- `backend/` — API, Prisma schema, seed
- `frontend/` — app React con Vite y Tailwind

Instrucciones rápidas (Windows PowerShell):

1. Backend

```powershell
cd "c:\Users\ASUS TUF A15\Downloads\Wilmas Fashion\backend"
npm install
copy .env.example .env
# Editar .env y colocar DATABASE_URL y JWT_SECRET
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

2. Frontend

```powershell
cd "c:\Users\ASUS TUF A15\Downloads\Wilmas Fashion\frontend"
npm install
npm run dev
```

Siguientes entregables planificados:
- Implementar autenticación JWT completa
- CRUD de productos y dashboard
- Gráficos y estadísticas