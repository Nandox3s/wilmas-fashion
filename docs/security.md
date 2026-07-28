# Seguridad

Helmet, CORS allowlist, JSON 1 MB, rate limit de auth, validación central, JWT con usuario consultado en base y roles cerrados. Registro ignora rol; USER recibe 403 al eliminar; respuestas no incluyen hash ni stack. npm audit productivo quedó en cero vulnerabilidades tras actualizar Express 4.x.

Pendientes previos a producción: rotación/almacenamiento de JWT secret, validación magic bytes S3, CSRF/state para redirects PayPhone, firma/autorización formal de webhook, política de contraseñas/recuperación, escaneo de imágenes y pruebas PostgreSQL reales.
