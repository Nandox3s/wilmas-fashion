# Wilmas Fashion - Guía de Despliegue

## Pasos para poner en producción con GitHub

### 1️⃣ Inicializar el repositorio Git

```bash
cd "c:\Users\ASUS TUF A15\Downloads\Wilmas Fashion"
git init
git add .
git commit -m "Initial commit: Wilmas Fashion e-commerce app"
```

### 2️⃣ Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `wilmas-fashion` (o tu preferencia)
3. NO inicialices con README (ya tiene contenido)
4. Click **Create repository**

### 3️⃣ Conectar y hacer push

```bash
git remote add origin https://github.com/TU_USUARIO/wilmas-fashion.git
git branch -M main
git push -u origin main
```

### 4️⃣ Configurar secretos en GitHub para CI/CD

1. Ve a tu repositorio en GitHub
2. Ir a **Settings** → **Secrets and variables** → **Actions**
3. Agrega estos secretos (click "New repository secret"):

```
DOCKER_USERNAME  → tu usuario de Docker Hub
DOCKER_PASSWORD  → tu token de Docker Hub (desde account.docker.com)
```

Para Docker Hub:
- Crea cuenta gratis en [hub.docker.com](https://hub.docker.com)
- Ve a Account Settings → Security → Personal Access Tokens
- Genera un nuevo token y cópialo

### 5️⃣ Opción A: Desplegar con Railway (Recomendado para principiantes)

Railway permite deploy automático desde GitHub sin configuración extra.

1. Ve a [railway.app](https://railway.app)
2. Sign in con GitHub
3. New Project → Deploy from GitHub repo
4. Selecciona `wilmas-fashion`
5. Elige la rama `main`
6. Configura variables de entorno:

```
BACKEND:
- PORT=4000
- NODE_ENV=production
- JWT_SECRET=tu_secreto_seguro_aqui
- DATABASE_URL=file:./prisma/dev.db

FRONTEND:
- VITE_API_BASE=https://tu-backend.railway.app
```

7. Deploy automático al hacer push a `main`

### 5️⃣ Opción B: Desplegar con Render.com

1. Ve a [render.com](https://render.com)
2. Sign up con GitHub
3. **New Web Service** desde el repo
4. Configurar build y runtime
5. Variables de entorno (como arriba)

### 5️⃣ Opción C: Docker Hub + Vercel (Frontend) + Railway (Backend)

**Backend (Docker Hub → Railway):**
1. Imagen construida automáticamente por GitHub Actions
2. Railway lo deploya desde Docker Hub

**Frontend (Vercel):**
1. Ve a [vercel.com](https://vercel.com)
2. Import proyecto desde GitHub
3. Framework: Vite (automático)
4. Build: `npm run build`
5. Output: `dist`

---

## Flujo de despliegue automático

Después de configurar todo:

```bash
# Hacer cambios locales
git add .
git commit -m "Fix: descripción del cambio"
git push origin main
```

✅ Automáticamente:
1. GitHub Actions buildea Docker image
2. Pushea a Docker Hub
3. Railway/Render detecta cambios
4. Deploy automático

---

## Verificar que esté funcionando

Después de desplegar:

```bash
# Backend en vivo
curl https://tu-backend.railway.app/api/ping

# Frontend en vivo
https://tu-frontend.vercel.app
```

---

## Variables de entorno en producción

**Backend (.env en Railway/Render):**
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="secreto_muy_seguro_min_32_caracteres"
PORT=4000
NODE_ENV=production
```

**Frontend (en Vercel o Railway):**
```
VITE_API_BASE=https://tu-backend.railway.app
```

---

## Tips de seguridad

- ✅ Cambia JWT_SECRET a algo único y largo (32+ caracteres)
- ✅ Usa HTTPS en todos lados
- ✅ No comitees `.env` (ya está en `.gitignore`)
- ✅ Habilita 2FA en GitHub
- ✅ Usa tokens en vez de contraseñas para Git

---

## Monitoreo

Una vez deployado, puedes usar:
- Railway Dashboard (logs en vivo)
- Vercel Analytics (para frontend)
- GitHub Actions (histórico de builds)

¿Necesitas ayuda con algún paso específico?
