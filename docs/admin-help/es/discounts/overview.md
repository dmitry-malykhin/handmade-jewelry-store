# Códigos de descuento

## Para qué sirve

Códigos promocionales que el cliente introduce en el checkout para
reducir el total. Dos sabores: porcentaje (`10% de descuento`) o
importe fijo (`$5 de descuento`).

Usa esta página para:

- Crear códigos para campañas (`WELCOME10`, `SUMMER25`, `BFCM30`)
- Activar / desactivar códigos (toggle)
- Ver estadísticas de uso
- Soft-delete de códigos que ya no deberían ser válidos

## Campos y controles

### Código
- **Para qué**: La cadena que el cliente teclea en el campo de descuento
  del checkout.
- **Cómo rellenar**: 3–30 caracteres: `A-Z 0-9 guión subrayado`.
  Sin distinción de mayúsculas en canje (`welcome10` funciona para
  `WELCOME10`).
- **Efecto**: Identificador para clientes. Una vez compartido,
  considéralo inmutable.
- **Recomendación**: MAYÚSCULAS, corto, memorable.
  `WELCOME10`, `THANKS5`, `VIP15`.

### Tipo
- **Para qué**: Cómo se calcula el descuento.
- **Valores**:
  - `Porcentaje` — `Valor` es un porcentaje (1–100)
  - `Importe fijo` — `Valor` es céntimos (`500` = $5.00)

### Valor
- **Para qué**: Magnitud del descuento.
- **Cómo rellenar**:
  - Para `Porcentaje`: entero 1–100 (validado en el formulario)
  - Para `Importe fijo`: céntimos (`500` = $5)
- **Efecto**: Limitado al subtotal del pedido en checkout — no puede
  ir negativo.
- **Recomendación**: 10–15% para códigos de primera compra; $5–10 fijo
  para clientes leales.

### Pedido mínimo (céntimos)
- **Para qué**: El descuento solo aplica si
  `subtotalCents >= minOrderCents`.
- **Cómo rellenar**: Céntimos (`5000` = $50).
- **Efecto**: Evita que se quemen códigos del 10% en pedidos de $10.
- **Recomendación**: 3–5x el valor del descuento (un 10%-código
  necesita al menos $50 pedido).

### Usos máximos (opcional)
- **Para qué**: Cap total de canjeos. Tras N checkouts exitosos el
  código deja de funcionar para todos.
- **Cómo rellenar**: Entero ≥ 1, o deja vacío para ilimitado.
- **Efecto**: Útil para promos limitadas y códigos de influencers.

### Fecha de caducidad (opcional)
- **Para qué**: Fecha tras la cual el código deja de ser válido.
- **Cómo rellenar**: Date picker. Medianoche UTC.
- **Efecto**: Tras la fecha, el código devuelve error «caducado» en
  checkout.

### Toggle de activación (por fila)
- **Para qué**: Desactivar temporalmente sin eliminar.
- **Efecto**: Códigos inactivos devuelven «inválido» en checkout.
  Toggle de vuelta para reactivar.

### Acción de eliminar (por fila)
- **Para qué**: Soft-delete — pone `deletedAt`, retira el código de la
  lista, pero conserva los pedidos históricos que lo usaron.
- **Efecto**: El historial de pedidos queda intacto (sigues viendo el
  descuento aplicado en pedidos pasados). El código ya no puede usarse.
  No hay deshacer en la UI — necesitarías acceso a BD.

## Escenarios típicos

**Oferta de bienvenida a newsletter**
Código: `WELCOME10` | tipo `Porcentaje` | valor `10` | pedido mín
`5000` ($50) | sin caducidad | sin máx. usos. Activo.

**Black Friday — stock limitado, 30% off, primeros 100 clientes**
Código: `BFCM30` | `Porcentaje` 30 | mín `0` | máx. usos `100` |
caduca 30 nov. Activo.

**Colab con influencer — $20 off cualquier pedido, 500 canjeos**
Código: `JANE20` | `Importe fijo` 2000 | mín `0` | máx. usos `500` |
caduca en 3 meses. Activo.

## Avisos

- **Valor porcentaje > 100 es rechazado** por el formulario (cliente +
  servidor).
- **Total de pedido negativo se fija a cero** — un código `$50 off` en
  un pedido de $30 lo hace gratis, nunca negativo.
- **Códigos sin distinción de mayúsculas en canje** pero almacenados
  tal como los escribiste. MAYÚSCULAS para legibilidad.
- **Soft-delete conserva el historial.** Un código eliminado sigue
  apareciendo en la línea «descuento aplicado» de pedidos antiguos.
- **La integración con el checkout está aplazada** — esta página
  gestiona códigos, pero aplicarlos en checkout es otra tarea en el
  backlog. Hasta entonces los códigos no reducen totales reales.
- **No hay límite por cliente** — un mismo cliente puede usar el
  mismo código muchas veces hasta agotar los usos máximos.

## Secciones relacionadas

- [Resumen de pedidos](../orders/overview.md) — qué pedidos usaron qué código
- [Ajustes — General](../settings/general.md)
