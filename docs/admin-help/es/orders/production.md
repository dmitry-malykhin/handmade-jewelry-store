# Producción

## Para qué sirve

Vista de taller — pedidos con artículos hechos a pedido o piezas únicas.
Estas piezas se fabrican **después** del pago, así que la cola muestra
lo que está actualmente en tu mesa y la cercanía de cada fecha límite.

La fecha límite se calcula en el checkout desde `Días de producción`
del producto — ver columna **Fecha límite** abajo.

Usa esta página para:

- Ver en qué trabajar primero (por fecha límite)
- Actualizar el estado de cada pieza durante el proceso
- Mantener una nota libre por pedido (p.ej. «necesita lapislázuli,
  pedido el lunes»)

## Campos y controles

### Fecha límite
- **Para qué**: Días restantes hasta la fecha prometida.
- **Codificación visual**:
  - Badge rojo **Atrasado** — pasó la fecha
  - Badge rojo **Hoy** — fecha es hoy
  - Píldora ámbar — 1–3 días
  - Píldora verde — 4+ días
- **Cómo se calcula**: `productionDeadlineAt` del pedido (fijado en
  checkout por la pieza más lenta) menos ahora, redondeado a días enteros.

### Estado (por fila)
- **Para qué**: Dónde está este pedido en la producción.
- **Valores**:
  - `En cola` — no empezado
  - `En producción` — siendo fabricado
  - `Listo para enviar` — terminado, esperando empaque
- **Cómo rellenar**: Selecciona del dropdown → guardado inmediato.
- **Efecto**: `Listo para enviar` **no envía automáticamente** — sigues
  yendo al detalle del pedido para guardar seguimiento y pasar el
  estado del **pedido** a Enviado.
- **Flujo recomendado**: En cola → En producción (al coger herramientas)
  → Listo para enviar (pieza acabada, fotografiada, empacada).

### Notas
- **Para qué**: Memo libre por pedido. 500 chars.
- **Cómo rellenar**: Escribe → Enter o clic fuera → autoguardado.
- **Efecto**: Solo visibles al admin. El cliente nunca las ve.
- **Casos de uso**: Seguimiento de materiales pedidos, notas de
  bloqueo, peticiones de personalización del cliente.

## Escenarios típicos

**Revisión matutina del taller**
Ordena visualmente por fecha límite (la tabla ya está ordenada) →
trabaja de arriba abajo. Lo rojo va primero.

**Material pedido, bloqueado una semana**
Estado se queda en `En cola`. Nota: «esperando cuarzo rosa 6mm del
proveedor, ETA viernes». Re-revisa el viernes.

**Pieza terminada**
Estado → `Listo para enviar`. Abre el detalle del pedido, guarda
seguimiento, pasa el pedido a `Enviado`. La fila de producción se
queda en Listo para enviar hasta que el pedido salga del territorio
hecho-a-pedido.

## Avisos

- **Una fila aparece solo si el pedido tiene al menos un artículo
  hecho a pedido.** Pedidos puros de stock nunca entran en esta cola.
- **La columna «Piezas» cuenta solo los artículos hechos a pedido** —
  no el tamaño total del carrito.
- **Fecha límite 0 / negativa** no marca al cliente ni envía email
  automáticamente. Es solo tu pista visual; tú decides cómo manejar
  el retraso (reembolso vs notificar y continuar).
- **Las notas no aparecen en el pedido del cliente** — son internas.
- **Pedido cancelado en plena producción**: la fila se queda hasta que
  elimines los artículos hechos a pedido vía gestión del pedido. No
  hay forma inline de descartar una fila sin cambiar el pedido.

## Secciones relacionadas

- [Resumen de pedidos](overview.md)
- [Detalle del pedido](detail.md) — donde vive el seguimiento y el
  estado público
- [Editar producto](../products/edit.md) — establece `Días de producción`
  por producto
