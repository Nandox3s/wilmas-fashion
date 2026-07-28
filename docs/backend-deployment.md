# Despliegue backend

El backend usa Node 20, `Procfile`, `npm start`, `PORT`, stdout/stderr y `/api/ping`. La imagen Docker no ejecuta `db push` ni migraciones al reiniciar. Ejecutar `npm run migrate:deploy` como paso separado, una vez y con respaldo.

Elastic Beanstalk SingleInstance reduce costo pero no ofrece el mismo HTTPS/alta disponibilidad que un ALB. Para producción, decidir entre ALB+ACM o mantener temporalmente Render HTTPS. Variables y secretos se inyectan desde referencias autorizadas, nunca desde un bundle.
