# Storage

`LocalStorageProvider` sirve desarrollo y guarda keys únicas. `S3StorageProvider` usa AWS SDK, cifrado SSE-S3, presigned PUT de 5 minutos y descarga firmada. Productos y facturas usan buckets separados; Terraform habilita Block Public Access y versionado de invoices.

Presign valida MIME, extensión y máximo 5 MB. Antes de producción falta validar magic bytes tras upload en `complete` (por ejemplo, Lambda o lectura parcial S3); por ello ese endpoint todavía no debe tratar el objeto como publicado automáticamente.
