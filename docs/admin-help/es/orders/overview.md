# Pedidos

## Para qué sirve

Fuente única de verdad sobre todas las compras. Cada checkout exitoso
de Stripe aterriza aquí y avanza por una máquina de estados lineal
hasta **Entregado** (o **Reembolsado** / **Cancelado**).

Usa esta página para:

- Ver los pedidos entrantes de un vistazo
- Mover un pedido por su ciclo de vida (Pagado → En proceso → Enviado → Entregado)
- Filtrar por estado para priorizar el trabajo

Para trabajar con un pedido concreto (seguimiento, reembolso, dirección
completa, artículos) pulsa **Ver** — ver [Detalle del pedido](detail.md).

## Campos y controles

### Filtrar por estado
- **Para qué**: Reducir la tabla a un solo estado.
- **Cómo rellenar**: Selección del dropdown. `Todos los estados` muestra todo.
- **Efecto**: Reinicia la paginación a 1, recarga la tabla.
- **Recomendación**: `Todos los estados` para la revisión diaria;
  `Pagado` al sentarte a preparar pedidos; `Enviado` para verificar la
  entrega.

### Columna Estado (dropdown en línea)
- **Para qué**: Clic en el badge → elegir el siguiente estado permitido.
- **Cómo rellenar**: Solo se ofrecen transiciones válidas (ver máquina abajo).
- **Efecto**: Guardado inmediato. El cliente verá la actualización al instante.
  Deshacer — transicionando más adelante o vía reembolso.

### Enlace Ver
- **Para qué**: Página completa del pedido con dirección, artículos,
  historial, seguimiento y reembolsos.

## Máquina de estados

Transiciones permitidas (whitelist del backend):

```
Pendiente         → Pagado, Cancelado
Pagado            → En proceso, Cancelado
En proceso        → Enviado, Cancelado
Enviado           → Entregado
Entregado         → Reembolsado, Reembolso parcial
Cancelado         → Reembolsado, Reembolso parcial
Reembolsado       → (final)
Reembolso parcial → (final)
```

`Pendiente → Pagado` ocurre automáticamente vía webhook de Stripe —
casi nunca lo haces a mano.

## Escenarios típicos

**Rutina matutina**
Filtro `Pagado` → por cada fila abre el detalle → empaqueta → guarda
número de seguimiento → el estado pasa automáticamente a `Enviado`.

**El cliente escribió que el paquete llegó**
Encuentra el pedido (filtro `Enviado` + búsqueda por email en el
detalle) → pasa a `Entregado`. En esta transición se acreditan puntos
de fidelidad.

**Cancelar un pedido sin pagar**
`Pendiente → Cancelado` desde el dropdown. No hay pago — no hay
reembolso.

## Avisos

- **Columna N.º de pedido** muestra solo los últimos 8 caracteres; el
  UUID completo está en la URL al pulsar **Ver**.
- **Columna Cliente** muestra `guestEmail` para invitados. Para
  registrados también email; el tipo no se ve aquí — solo en el detalle.
- **Paginación de 20.** En una semana ocupada habrá varias páginas — usa
  el filtro de estado, no el scroll.

## Secciones relacionadas

- [Detalle del pedido](detail.md) — flujo por pedido
- [Reembolsos](refunds.md) — historial (solo lectura) de todos los reembolsos
- [Producción](production.md) — piezas hechas a pedido en curso
