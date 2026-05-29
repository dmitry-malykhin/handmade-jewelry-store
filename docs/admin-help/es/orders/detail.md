# Detalle del pedido

## Para qué sirve

Espacio de trabajo para un solo pedido. Aquí está todo lo necesario
para preparar, hacer seguimiento, reembolsar o investigar la compra.

Estructura de arriba abajo:

1. **Resumen del pedido** — IDs, totales, origen, estado de pago
2. **Cliente** — email + tipo (Invitado / Registrado)
3. **Artículos** — qué se envía
4. **Dirección de envío**
5. **Estado del pedido** — botones para avanzar la máquina de estados
6. **Seguimiento** — formulario transportista + número
7. **Botón de reembolso** — abre el modal (solo si el pago `SUCCEEDED` o `PARTIALLY_REFUNDED`)
8. **Historial de estados** — cada cambio con timestamp y autor

## Campos y controles

### Botones «Cambiar a …»
- **Para qué**: Un clic por cada transición hacia adelante permitida.
- **Efecto**: Guardado inmediato. Añade una entrada al historial. Al
  pasar a `Entregado` se acreditan puntos de fidelidad y se envía email
  de confirmación.
- **Orden recomendado**: Pagado → En proceso (al empezar el trabajo) →
  Enviado (tras guardar seguimiento) → Entregado (cuando el cliente
  confirma).

### Seguimiento — Transportista
- **Para qué**: Qué empresa entrega el paquete.
- **Cómo rellenar**: Selecciona `USPS / FedEx / UPS / DHL`.
- **Efecto**: Mostrado al cliente en el email del pedido y en su cuenta.

### Seguimiento — Número de seguimiento
- **Para qué**: ID del envío del transportista.
- **Cómo rellenar**: Cópialo tal cual en la etiqueta. Sin espacios.
- **Efecto**: Guardar → el estado pasa a `Enviado` automáticamente (si
  no lo estaba) y el cliente recibe email «tu pedido fue enviado».
- **Caso límite**: Guardar el número en un pedido ya enviado actualiza
  el número sin reenviar email — útil si tipeaste mal.

### Etiqueta de envío (EasyPost)
- **Para qué**: Comprar una etiqueta real del transportista sin salir
  del pedido.
- **Cuándo aparece**: Solo en pedidos `PAID` o `PROCESSING` que aún no
  tienen etiqueta. Después de comprarla, el formulario se reemplaza por
  un enlace «Descargar PDF de etiqueta».
- **Insignia de modo**: `Dry run` significa que no hay `EASYPOST_API_KEY`
  configurada — el sistema fabrica una URL y número de tracking falsos
  para probar el flujo. `Live` significa que el próximo clic cuesta
  dinero real. Mira siempre la insignia antes de comprar.
- **Transportista**: Las mismas 4 opciones que el seguimiento manual.
  El transportista elegido aquí se escribe automáticamente en el pedido.
- **Switch de seguro**: Solo aparece para pedidos ≥ $100. Activarlo
  asegura el paquete por el total del pedido. No hay UI para seguro
  parcial; si necesitas un monto específico, usa el portal del
  transportista directamente.
- **Efecto**: Un clic escribe shipment id, tracker id, número de
  seguimiento, URL de etiqueta y seguro en el pedido. El estado **no**
  pasa a `Enviado` — primero entrega el paquete, luego sube el estado
  a mano. Cuando el transportista marque la entrega, el webhook de
  EasyPost transiciona el pedido a `DELIVERED` automáticamente (lo que
  dispara el crédito de fidelidad y el email).

### Botón de reembolso
- **Para qué**: Reembolso total o parcial vía Stripe.
- **Cuándo aparece**: Solo cuando `payment.status` es `SUCCEEDED` o
  `PARTIALLY_REFUNDED`. Oculto para reembolsados-completos y no pagados.
- **Cómo rellenar**: Ver modal — deja importe vacío para reembolso
  total, elige siempre motivo, añade nota para tu archivo.
- **Efecto**: Llama a Stripe `refunds.create`, actualiza el estado del
  pedido, envía email al cliente, registra entrada visible en el
  [registro de reembolsos](refunds.md).

## Escenarios típicos

**Preparación estándar**
Llega pedido Pagado → envía → guarda seguimiento → el estado pasa
automáticamente a Enviado → cuando el cliente confirme o pase el
estimado de entrega, pasa a Entregado.

**El cliente pide reembolso parcial (p.ej. pendiente dañado en pedido de $200)**
Pulsa **Emitir reembolso** → importe `30.00` → motivo `Artículo dañado`
→ nota «pendiente izquierdo doblado, reembolso del valor de una pieza».
Submit. El pedido pasa a `Reembolso parcial`.

**Número de seguimiento equivocado guardado**
Solo guarda el correcto. No hace falta revertir el estado.

## Avisos

- **Origen** muestra de dónde vino el pedido (`web`, `pos`, …). Vacío
  (`—`) para pedidos antiguos antes del tracking de origen.
- **`por` en el historial** es el email del admin que hizo la
  transición. Los webhooks de Stripe aparecen como `system`.
- **El botón de reembolso desaparece tras un reembolso total** — el
  estado es `Reembolsado`, no hay nada que reembolsar. El pedido sigue
  legible para auditoría.
- **La máquina de estados es unidireccional**: tras `Reembolsado` o
  `Entregado` no puedes ir «atrás». El crédito de fidelidad al pasar a
  `Entregado` solo se revierte vía reembolso.

## Secciones relacionadas

- [Resumen de pedidos](overview.md)
- [Reembolsos](refunds.md)
- [Producción](production.md) — para piezas por encargo el trabajo
  empieza aquí
