# Primeros pasos

## Para qué sirve el Panel de administración

Es el espacio de trabajo de la propietaria de la tienda. Desde aquí
gestionas productos, pedidos, clientes, códigos de descuento y ajustes.
Los clientes no entran aquí — solo usuarios con rol `ADMIN`.

Regla clave: todo lo que cambias se **refleja inmediatamente para los
clientes** (ISR del catálogo dentro de 1 hora; checkout instantáneo).
No hace falta deploy.

## Por dónde empezar

1. **Ajustes → General** — nombre de la tienda, lema, email de contacto.
2. **Categorías** — crea al menos una (por ejemplo `Anillos`), si no
   no podrás añadir productos.
3. **Productos** — añade el primero. Mínimo: título, precio, categoría,
   1 imagen.
4. Verifica la página pública — el producto debe aparecer.

## Secciones

- **Panel** — KPIs: ingresos, pedidos, ticket medio, gráfico de ingresos
- **Productos** — catálogo. Crear, editar, estados.
- **Pedidos** — todas las ventas. Cambio de estado, seguimiento, reembolsos.
- **Reembolsos** — registro (solo lectura) de todos los reembolsos.
- **Producción** — cola de piezas hechas a pedido con fechas límite.
- **Inventario** — existencias con alertas de stock bajo.
- **Clientes** — usuarios registrados + su Valor de vida.
- **Categorías** — taxonomía del catálogo (nombre + slug).
- **Descuentos** — códigos (porcentaje o importe fijo).
- **Ajustes** — nombre, emails, redes sociales, ventana de envío.

## Ayuda en cada sección

En la esquina superior derecha de cualquier página del admin hay un
botón `?`. Púlsalo (o la tecla `?` del teclado) — se abre la ayuda de
la página actual con descripción de campos, escenarios típicos y avisos.

## Lo que aún no existe

- Edición de datos del cliente — solo el cliente, desde su cuenta
- Exportación masiva a CSV — por ahora manual desde la BD
- Notificaciones en tiempo real de pedidos nuevos — llegan por email

## Secciones relacionadas

- [Resumen de productos](products/overview.md)
- [Resumen de pedidos](orders/overview.md)
- [Ajustes de la tienda](settings/general.md)
