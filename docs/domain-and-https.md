# Dominio y HTTPS

Objetivo: `www.<DOMAIN>` en Amplify y `api.<DOMAIN>` en el backend. Amplify gestiona certificado; backend requiere ACM en la misma región y terminación TLS compatible. Validar por DNS CNAME/alias, restringir CORS a ambos orígenes y esperar desde minutos hasta 48 horas de propagación.

No se compró dominio, creó certificado ni cambió DNS. Alternativa temporal: dominio Amplify y URL HTTPS del hosting backend actual. Rollback: restaurar registros anteriores y `VITE_API_BASE`; mantener TTL bajo antes del cutover.
