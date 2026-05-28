# Analíticas

## Para qué sirve

Una sola pantalla con las métricas que guían las decisiones diarias
sobre producto: qué se vende, dónde se acumulan pedidos, quién compra
y qué tan rápido se envía. Todas las cifras se calculan según el
período seleccionado arriba — por defecto **los últimos 30 días**.

Usa esta página cuando te preguntes:

- "¿Qué piezas debería fabricar más?"
- "¿Están subiendo los reembolsos?"
- "¿Cuántos días pasan entre el pedido y la entrega este mes?"

## Selector de período

Cambia todos los bloques de la página a la vez.

- **7 días** — vista operativa; detecta picos repentinos.
- **30 días** — predeterminado; el ritmo para el que están afinados
  los umbrales.
- **90 días** — vista trimestral; suaviza ráfagas cortas.
- **1 año** — vista de largo plazo; útil para comparar temporada vs.
  temporada.

El período es local para esta página — no se traslada al gráfico de
ingresos del dashboard. Al recargar la pestaña se pierde la selección.

## Métricas clave (4 tarjetas)

### Clientes nuevos
Clientes cuyo **primer pedido pagado** cae dentro del período.

- Cuenta solo clientes registrados (los pedidos invitados no tienen
  identificador para rastrear).
- Un cliente puede contarse como "nuevo" otra vez solo si su cuenta
  anterior fue eliminada por completo y se registró de nuevo.

### Clientes recurrentes
Clientes registrados que hicieron un pedido pagado dentro del período
**y** tienen al menos un pedido pagado anterior fuera de él.

- Nuevos + Recurrentes ≠ total de pedidos — los invitados quedan
  fuera, y un cliente con tres pedidos en la ventana sigue contando
  como uno.

### Tasa de reembolso
`pedidos reembolsados ÷ pedidos pagados × 100`, redondeado al entero
más cercano.

- "Pagado" aquí incluye cualquier pedido con cobro:
  `PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `PARTIALLY_REFUNDED`.
- Por encima del **5%** en un mes vale la pena investigar — abre
  Pedidos → Reembolsos del período y busca patrones.

### Días promedio hasta la entrega
Promedio de `deliveredAt − createdAt` para pedidos **entregados**
dentro del período.

- Redondeado a días enteros.
- Solo incluye pedidos con ambas marcas de tiempo — los pendientes,
  en proceso o enviados no afectan.
- Las subidas suelen ser carga de producción, no envíos.

## Top de productos (tabla)

Ranking por **ingresos** dentro del período (descendente), máx. 10
filas.

- Ingresos = `suma(precio × cantidad)` por todas las líneas de los
  pedidos, incluso con descuento aplicado — cuenta el precio de la
  línea.
- Unidades vendidas = suma de cantidades. Un pedido de tres anillos
  son 3 unidades.
- Imagen, título, rating y número de reseñas se leen en vivo del
  registro actual del producto — si lo renombraste o lo ocultaste,
  verás los valores nuevos.
- Productos eliminados no aparecen, aunque haya historial en el
  período.

El título del producto enlaza a la página pública para que puedas
revisar el listado sin salir del admin.

## Desglose por estado de pedido (donut)

Cuenta pedidos por su estado **actual** en el período — no por el
estado que tenían al crearse.

- Los 8 estados siempre aparecen en la leyenda, incluso con conteo
  cero, así el layout no salta al cambiar de período.
- El gráfico oculta los sectores de cero (los segmentos fantasma
  estorban).
- Los números reflejan pedidos **creados** en el período — un pedido
  de enero entregado en marzo sigue siendo de enero.

## Escenarios típicos

### "Bajaron las ventas — ¿qué cambió?"
1. Cambia a **7 días**.
2. Compara el top de productos contra la semana anterior (manual,
   sin overlay todavía).
3. Revisa la tasa de reembolso — un pico de reembolsos baja el neto.

### "Producción está saturada"
1. Compara **días promedio hasta la entrega** 30d vs 90d.
2. Si 30d empeoró notablemente, mira el desglose: el conteo de
   `PROCESSING` es la profundidad de la cola.

### "¿Qué categorías venden mejor?"
Aún no está en esta vista — el top es por producto. Como solución
intermedia, filtra por categoría en Productos.

## A tener en cuenta

- Los números se calculan en cada visita. No hay caché — recargar
  varias veces no cuesta nada.
- Internamente todos los montos están en **centavos USD** y se
  muestran en USD; la multi-divisa todavía vive solo en el gráfico
  del dashboard.
- El tiempo se calcula en la zona horaria local del servidor. Antes
  del lanzamiento, en una sola zona horaria, esto basta; al cambiar
  de región habrá que revisarlo.
