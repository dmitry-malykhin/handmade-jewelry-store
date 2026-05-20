# Reembolsos

## Para qué sirve

Solo lectura — registro de todos los reembolsos emitidos vía admin.
Una fila por pedido reembolsado o parcialmente reembolsado, los más
recientes arriba.

**Aquí no se emiten reembolsos** — se crean desde la página
[Detalle del pedido](detail.md) con el botón **Emitir reembolso**.
Esta página existe para:

- Conciliación contable («¿cuánto reembolsamos este mes?»)
- Detección de patrones (muchos `Artículo dañado` en un producto →
  problema de calidad)
- Búsqueda rápida («¿qué reembolso fue de esa orden Klarna del martes?»)

## Columnas

| Columna | Significado |
|---|---|
| **Pedido** | Últimos 8 caracteres, clic → detalle del pedido |
| **Cliente** | Email del invitado; `—` para registrados (privacidad) |
| **Reembolsado** | USD reembolsado (suma si hay varios parciales) |
| **Motivo** | El elegido al emitir el reembolso |
| **Fecha** | Fecha en que se procesó el reembolso |
| **Estado** | `Reembolsado` (total) o `Reembolso parcial` |

## Escenarios típicos

**Conciliación contable mensual**
Abre la página → suma la columna **Reembolsado** → coteja con el
informe de reembolsos de Stripe Dashboard. Las cifras deben coincidir
hasta el céntimo (Stripe es la fuente autoritativa — nosotros
reflejamos, no duplicamos).

**Investigación de calidad**
Filtra mentalmente las filas con `Artículo dañado` → entra al detalle
→ apunta el SKU. Si 3+ reembolsos sobre el mismo SKU → archiva el
producto o revisa la construcción.

**Buscar un reembolso concreto**
Búsqueda por ID corto vía Ctrl/Cmd+F en la tabla (no hay búsqueda en
servidor — esta vista es ligera).

## Avisos

- **Una fila aparece solo tras un reembolso exitoso en Stripe.** Los
  intentos fallidos no aparecen — mira el toast en la página de detalle.
- **Columna Cliente vacía** no significa invitado — es un usuario
  registrado (ocultamos su email aquí; clic al detalle para ver datos).
- **Varios reembolsos parciales en un pedido** aparecen como una sola
  fila con el importe sumado. Los eventos individuales están en el
  historial del pedido.

## Secciones relacionadas

- [Detalle del pedido](detail.md) — donde se emiten los reembolsos
- [Resumen de pedidos](overview.md)
