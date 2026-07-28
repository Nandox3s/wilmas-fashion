# Facturación electrónica

Mock genera XML y RIDE marcados `DEMO - NOT A TAX DOCUMENT`; no son comprobantes tributarios. Pago e invoice tienen estados independientes. El worker valida `ISSUE_INVOICE`, pedido pagado e idempotencia antes de emitir y guardar documentos privados.

Dátil permanece bloqueado detrás del adaptador: su API requiere `X-Key`, contraseña del certificado y payload tributario completo. No se añadieron certificado, contraseña ni respuestas inventadas. La API oficial describe emisión REST e idempotency key de 16–48 caracteres: [Dátil API](https://datil.dev/). Antes de sandbox se necesitan issuer, API key, certificado de pruebas, contraseña en Secrets Manager y revisión fiscal.
