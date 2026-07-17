# Despliegue de Wilmas Fashion

## Backend en Render

El backend usa SQLite. Configure `DATABASE_URL`, `JWT_SECRET`, `PORT` y opcionalmente `CORS_ORIGINS`. `JWT_SECRET` es obligatoria y el proceso no inicia si falta.

SQLite escribe en un archivo local; el sistema de archivos de Render puede ser efímero. Para conservar datos entre despliegues se requiere un disco persistente y una ruta `DATABASE_URL` dentro de ese volumen. No ejecute el seed en producción: elimina y reemplaza datos.

Comandos recomendados:

```text
npm install
npx prisma generate
npx prisma db push
npm start
```

## Frontend en Vercel

Configure `VITE_API_BASE=https://wilmas-fashion.onrender.com`. La API admite por defecto `http://localhost:5173` y `https://wilmas-fashion.vercel.app`; agregue otros dominios en `CORS_ORIGINS`, separados por comas.

El rewrite de SPA está definido en `frontend/vercel.json`.

## Seguridad y alcance

- No publique `.env`, `dev.db`, secretos ni credenciales reales.
- Use HTTPS y una clave JWT larga y aleatoria.
- El checkout es una simulación académica; no integra pagos ni guarda tarjetas.
- Si GitHub Actions no inicia por facturación, ese bloqueo no indica un fallo del código. Revise por separado los logs de los pasos que sí llegaron a ejecutarse.
