# Email

ConsoleEmailProvider es el default y solo registra dominio del destinatario, plantilla y referencia. SesEmailProvider usa SES v2 y mensajes de texto mínimos. Configurar `<SES_FROM_EMAIL>`, verificar identidad y recordar que el sandbox de SES solo permite destinos verificados y límites reducidos. No se envían correos reales por defecto.
