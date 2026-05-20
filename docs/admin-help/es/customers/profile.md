# Perfil del cliente

## Para qué sirve

Vista profunda de un cliente registrado. Metadatos del perfil, cada
pedido que ha hecho, y cada dirección de envío usada.

Esta página es de solo lectura. No hay override admin para campos del
cliente — el cliente gestiona su email, contraseña y direcciones desde
su cuenta en la tienda. Es intencional: las ediciones de PII deben ser
auditables y no deberían ser de un clic.

## Secciones

### Tarjeta de perfil
- **Email** — email de login
- **Registrado** — fecha de creación de cuenta
- **Pedidos totales** — conteo, todos los estados
- **Valor de vida** — USD pagados menos reembolsos (misma fórmula que
  la lista)

### Historial de pedidos
Cada pedido del cliente, los más recientes arriba. Cada fila enlaza al
detalle. El badge de estado refleja el estado actual del pedido.

### Direcciones guardadas
Cada dirección de envío guardada en la cuenta. La marcada como
**Predeterminada** se autocompleta en el checkout.

## Escenarios típicos

**Llamada de soporte**
«Quiero consultar el pedido ABC123 de la semana pasada» → búsqueda por
su email en [Clientes](overview.md) → abre el perfil → clic en el
pedido del historial → llegas al detalle con contexto completo.

**Investigación de calidad de direcciones**
Varias entradas con erratas en **Direcciones** → marca al cliente
(apunta su ID) y verifica si las entregas fallidas correlacionan con
su Valor de vida antes de contactar manualmente.

**Verificación del historial de reembolsos**
El historial de pedidos muestra badges — `Reembolsado` y
`Reembolso parcial` destacan. Entra a cada uno para ver motivo e
historial.

## Avisos

- **No hay botones de edición por diseño** — los admin no cambian PII
  desde aquí. El cliente lo hace desde la tienda.
- **No hay botón «eliminar cliente».** Eliminación de cuenta es
  GDPR-sensible y solo ocurre vía flujo de soporte documentado
  (escala por email).
- **`isDefault` de dirección es por cliente.** Puede tener varias
  direcciones pero solo una predeterminada.
- **No existe perfil de invitado** — los invitados no tienen cuenta.
  Sus pedidos solo se acceden vía la página de pedidos.

## Secciones relacionadas

- [Resumen de clientes](overview.md)
- [Detalle del pedido](../orders/detail.md)
