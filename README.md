# Wilmas Fashion

Sistema web de gestión comercial, control de inventarios, pedidos, pagos y comprobantes desarrollado para la tienda de ropa **Wilmas Fashion**.

Proyecto de titulación de la carrera de **Tecnología Superior en Desarrollo de Software** de la **Pontificia Universidad Católica del Ecuador - PUCE TEC**.

---

## Demo

Aplicación desplegada:

**https://wilmasfashion.duckdns.org**

---

## Descripción

Wilmas Fashion nace como respuesta a la necesidad de modernizar procesos comerciales que anteriormente se realizaban de manera manual.

Antes del desarrollo del sistema, actividades como la consulta de disponibilidad, control de stock, registro de ventas, cálculo de valores y manejo de comprobantes dependían de observaciones directas, registros básicos y procesos manuales.

Esta forma de trabajo podía provocar:

- Inconsistencias entre el inventario físico y los registros administrativos.
- Dificultad para conocer el stock disponible.
- Errores en cálculos de precios, descuentos, impuestos y envío.
- Falta de trazabilidad entre cliente, producto, pedido, pago y comprobante.
- Mayor tiempo de atención al cliente.
- Dificultad para consultar información histórica.

Para solucionar esta problemática se desarrolló una plataforma web centralizada que integra catálogo, inventario, usuarios, pedidos, pagos, comprobantes y funciones administrativas.

---

## Objetivo general

Desarrollar un sistema web de control de inventarios y facturación electrónica para la tienda de ropa **Wilmas Fashion**, mediante la automatización del registro de operaciones comerciales y la actualización del inventario, con el objetivo de mejorar la gestión del negocio, reducir inconsistencias y disponer de una plataforma tecnológica centralizada.

---

## Objetivos específicos

- Analizar los procesos operativos de Wilmas Fashion mediante técnicas de ingeniería de requisitos.
- Diseñar la arquitectura del sistema y el modelo de datos.
- Implementar una solución web integrando frontend, backend y base de datos.
- Gestionar productos, variantes, precios, stock, pedidos y usuarios.
- Implementar autenticación y autorización mediante roles.
- Incorporar un flujo de carrito y checkout.
- Implementar mecanismos para la gestión de pagos.
- Gestionar comprobantes PDF/XML.
- Validar las reglas de negocio tanto en frontend como en backend.
- Ejecutar pruebas funcionales y técnicas.
- Desplegar la aplicación en un entorno accesible mediante Internet.

---

## Características principales

### Catálogo de productos

El sistema dispone de un catálogo público donde los usuarios pueden visualizar los productos disponibles.

Incluye:

- Página principal.
- Catálogo general.
- Categorías Hombre y Mujer.
- Productos en oferta.
- Detalle de cada producto.
- Selección de talla.
- Selección de color.
- Imágenes reales de los productos.
- Precio y descuentos.
- Disponibilidad.
- Control de cantidades.

Actualmente el sistema trabaja con **17 productos reales activos** organizados en distintas familias de productos.

---

## Inventario

El administrador puede gestionar el inventario desde un panel protegido.

Funciones principales:

- Crear productos.
- Editar productos.
- Modificar precios.
- Administrar stock.
- Ocultar productos.
- Mostrar productos.
- Eliminar productos cuando no tienen historial protegido.
- Consultar productos con stock bajo.
- Buscar productos.
- Controlar productos activos.

El backend valida las operaciones críticas para impedir inconsistencias.

Entre las protecciones implementadas se encuentran:

- Stock nunca menor a cero.
- Validación de disponibilidad antes de confirmar operaciones.
- Revalidación del inventario en el servidor.
- Protección ante compras que superen la cantidad disponible.

---

## Usuarios y autenticación

El sistema permite registro e inicio de sesión.

Se utiliza autenticación mediante **JSON Web Tokens (JWT)** y se diferencian los siguientes roles:

### USER

Puede:

- Consultar productos.
- Administrar su carrito.
- Realizar pedidos.
- Acceder a sus operaciones.
- Consultar sus comprobantes.

### ADMIN

Puede:

- Administrar productos.
- Gestionar inventario.
- Consultar usuarios.
- Revisar pedidos.
- Gestionar comprobantes.
- Consultar información administrativa.

Un usuario registrado no puede asignarse automáticamente el rol de administrador.

Las funciones administrativas están protegidas tanto en frontend como en backend.

---

## Carrito de compras

El carrito permite:

- Agregar productos.
- Seleccionar talla y color.
- Modificar cantidades.
- Eliminar productos.
- Mantener información entre recargas.
- Consultar subtotal.
- Consultar envío.
- Consultar total.
- Continuar hacia el checkout.

Aunque el frontend realiza validaciones de cantidades, el backend vuelve a validar los productos, precios y stock antes de crear un pedido.

---

## Checkout

El checkout recopila los datos necesarios para completar una compra.

Incluye:

- Datos de facturación.
- Tipo de identificación.
- Número de identificación.
- Nombre o razón social.
- Correo.
- Teléfono.
- Dirección de entrega.
- Ciudad.
- Provincia.
- Referencia de entrega.
- Tipo de envío.
- Método de pago.
- Resumen del pedido.

El total no depende exclusivamente de la información enviada por el navegador.

El backend vuelve a consultar los datos y aplica las reglas de negocio antes de confirmar la operación.

---

## Métodos de pago

Actualmente la interfaz ofrece:

- **Pago al recibir**
- **PayPal**

### Pago al recibir

Permite crear un pedido sin registrar artificialmente un pago aprobado.

El pedido queda pendiente hasta que el pago sea realizado al momento de la entrega.

### PayPal

La versión final del sistema incorpora PayPal como proveedor de pago.

La integración realiza la creación y confirmación de la operación mediante el backend.

El frontend no decide por sí solo si un pago ha sido aprobado.

El servidor verifica el estado devuelto por el proveedor antes de actualizar el pedido.

> La configuración utilizada durante el desarrollo académico puede operar en un entorno de pruebas/Sandbox. La realización de cobros financieros productivos depende de las credenciales comerciales y configuración correspondiente del proveedor.

---

## PayPhone

Durante el desarrollo de la tesis se diseñó e implementó técnicamente una integración con **PayPhone**.

El flujo fue validado en un entorno controlado mediante los procesos de preparación y confirmación de transacciones.

Sin embargo, para realizar operaciones productivas era necesario disponer de credenciales comerciales como Token y StoreID, además de completar la habilitación correspondiente del comercio.

Durante la fase final se presentó una limitación externa relacionada con la validación comercial/RUC, por lo cual PayPhone no pudo ser habilitado como método productivo dentro del tiempo disponible para el proyecto.

Debido a que la arquitectura fue diseñada para desacoplar los proveedores externos de la lógica principal del sistema, fue posible incorporar **PayPal** como proveedor alternativo sin reconstruir completamente el flujo de pedidos e inventario.

---

## Facturación y comprobantes

El sistema incorpora un módulo para gestionar comprobantes asociados a los pedidos.

Permite:

- Registrar información de facturación.
- Relacionar comprobantes con pedidos.
- Descargar documentos PDF.
- Descargar documentos XML.
- Controlar el acceso a los documentos.
- Evitar la exposición pública directa de los archivos.

Los documentos se descargan mediante endpoints protegidos.

El backend verifica que el usuario:

- Sea propietario del pedido, o
- Tenga permisos administrativos.

Las rutas físicas de los documentos no se exponen directamente al público.

---

## Facturación electrónica y SRI

El proyecto se desarrolló como un **prototipo funcional académico**.

Desde el plan de titulación se estableció que la facturación electrónica no requería completar una operación tributaria productiva ante el Servicio de Rentas Internas.

La solución permite representar y gestionar la información necesaria para los comprobantes y trabajar con archivos PDF/XML.

Sin embargo, para emitir comprobantes electrónicos con validez tributaria real ante el SRI se requieren elementos adicionales como:

- Firma electrónica válida del emisor.
- Configuración tributaria correspondiente.
- Generación del XML bajo el esquema oficial.
- Firma digital del XML.
- Envío a los servicios del SRI.
- Recepción del comprobante.
- Consulta de autorización.
- Respuesta AUTORIZADO por el SRI.
- Generación del RIDE correspondiente.

Por este motivo, el proyecto **no se presenta como una plataforma tributaria certificada ni como una operación productiva autorizada por el SRI**.

El alcance académico consiste en demostrar el flujo tecnológico, la arquitectura y la gestión de comprobantes dentro del sistema.

---

## Panel administrativo

El sistema cuenta con un panel administrativo para facilitar el control del negocio.

El dashboard permite consultar información como:

- Cantidad de productos.
- Productos en oferta.
- Stock bajo.
- Usuarios.
- Pedidos.
- Actividad comercial.
- Inventario.

También permite acceder a las funciones de administración de productos.

---

## Manejo profesional de errores

El proyecto incorpora una capa centralizada para el manejo de errores.

Se controlan situaciones como:

- `400` - Solicitud inválida.
- `401` - Usuario no autenticado o sesión expirada.
- `403` - Usuario sin permisos.
- `404` - Recurso no encontrado.
- `409` - Conflicto de negocio o stock.
- `429` - Demasiadas solicitudes.
- `500` - Error interno.
- `502` - Error de servicio intermedio.
- `503` - Servicio temporalmente no disponible.
- Pérdida de conexión.
- Timeout.
- Errores inesperados de React.
- Stock insuficiente.
- Archivo de factura no disponible.
- Pago cancelado.
- Errores del proveedor de pago.

Las respuestas de error están normalizadas para evitar exponer información técnica innecesaria.

Ejemplo:

```json
{
  "success": false,
  "code": "INSUFFICIENT_STOCK",
  "message": "No hay suficiente stock disponible."
}
