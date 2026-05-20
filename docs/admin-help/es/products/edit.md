# Editar producto

## Para qué sirve

Modificar una ficha existente. Los campos son los mismos que en
[Crear producto](create.md) — la diferencia está en los efectos:

- **Los cambios se guardan al pulsar Guardar cambios**
- **Caché ISR del catálogo = 1 hora** — algunas ediciones tardan en
  aparecer al cliente; la página del propio producto se revalida más
  rápido
- **El cambio de estado** está disponible desde la tabla de productos
  (no hace falta abrir el editor)

## Qué cambiar con especial cuidado

### URL slug
- **Para qué**: Parte de la URL del producto.
- **Efecto al cambiarlo**: **Todos los enlaces externos se rompen** —
  Google Shopping feed, pins de Pinterest, ads de Facebook.
- **Recomendación**: No lo modifiques tras publicar. Si es imprescindible
  — añade redirect en `next.config.js`.

### Precio
- **Efecto**: Se aplica a futuros pedidos. Los pedidos y carritos
  existentes mantienen el precio capturado en el momento del añadir.
- **Recomendación**: Cambia todos los productos a la vez o sigue un
  plan de promoción.

### Tipo de stock
- **Efecto**: Cambiar de **En stock** a **Por encargo** modifica
  inmediatamente el flujo de pedido. Establece **Días de producción**,
  si no, el cliente no verá el plazo esperado.
- **Recomendación**: Al pasar a **Pieza única** — verifica que stock = 1
  (se fuerza por sistema).

### Cantidad en stock
- **Para qué**: Actualizar existencias rápidamente.
- **Alternativa**: Usa [Inventario](inventory.md) para edición inline
  sin abrir el formulario.

### Imágenes
- **Efecto**: Eliminar la imagen principal (primera) — la nueva
  principal se determina automáticamente.
- **Recomendación**: No elimines fotos en masa — añade nuevas y reordena
  con drag-and-drop.

## Escenarios típicos

**Quitar una foto de mala calidad y subir otra**
Abre el formulario → en **Imágenes** elimina la problemática → sube la
nueva → **Guardar cambios**.

**Subir el precio antes de la temporada**
Abre el formulario → **Precio** → nuevo valor → **Guardar**. Pedidos
futuros con el nuevo precio; carritos existentes con el antiguo.

**Errata en la descripción**
Abre el formulario → **Descripción** → corrige → **Guardar**. El cambio
es visible inmediatamente en la página del producto.

## Avisos

- **Los cambios de precio no recalculan pedidos existentes** —
  correctísimo (snapshot contable del precio al momento de compra).
- **Al cambiar a «Por encargo» rellena «Días de producción»** —
  si no, error de validación.
- **Eliminar producto solo si nunca tuvo pedidos** — si no, usa
  **Archivado** (estado).

## Secciones relacionadas

- [Crear producto](create.md) — descripción completa de todos los campos
- [Inventario](inventory.md) — edición rápida de stock
- [Resumen de productos](overview.md)
