# Crear producto

## Para qué sirve este formulario

Crea una ficha de producto nueva. Tras guardar, el producto aparece en
el catálogo con estado **Borrador** por defecto — los clientes no lo
ven hasta que lo pongas en **Activo**.

Rellena con cuidado: la calidad de los metadatos SEO y de la ficha
afecta directamente al tráfico orgánico y a la conversión.

## Secciones del formulario

1. **Información básica** — título, descripción, slug, SKU
2. **Precio y stock** — precio, cantidad, tipo de stock, días de producción
3. **Categoría y material**
4. **Dimensiones (opcional)** — longitud, ancho, alto, diámetro, peso, tamaño de cuenta
5. **Imágenes** — subida drag-and-drop

---

## Sección 1 — Información básica

### Título
- **Para qué**: Encabezado de la ficha, `<h1>` de la página, base del SEO.
- **Cómo rellenar**: Concreto y descriptivo. `Pulsera «Luces del Norte»
  de cristal checo`, no `Pulsera nº 1`. Hasta 200 caracteres.
- **Efecto**: Usado en SEO `<title>`, OpenGraph, JSON-LD, resultados de
  Google Shopping.
- **Recomendación**: Incluye la palabra clave (tipo de joya) + USP
  (material / estilo / ocasión).

### Descripción
- **Para qué**: Texto principal de la ficha + meta description SEO.
- **Cómo rellenar**: 100–500 palabras. Describe material, dimensiones,
  ocasión, cuidados. Sin Markdown — solo texto plano.
- **Efecto**: Influye en el ranking de Google y en la decisión de compra.
- **Recomendación**: 3–5 párrafos. El primero es el más importante
  (entra en meta description, máx. 160 chars).

### URL slug
- **Para qué**: Parte de la URL: `/products/{slug}`. Identificador
  canónico.
- **Cómo rellenar**: Se genera automáticamente del título (kebab-case,
  transliteración, sin caracteres especiales). Cámbialo manualmente solo
  si es necesario.
- **Efecto**: **No lo modifiques tras publicar** — los enlaces externos
  se romperán.
- **Recomendación**: Mantén el valor autogenerado.

### SKU (opcional)
- **Para qué**: Identificador interno del producto.
- **Cómo rellenar**: Cualquier formato siempre que sea único.
  Por ejemplo `BR-CRYSTAL-001`.
- **Efecto**: Visible en la ficha, factura y Google Shopping feed.

---

## Sección 2 — Precio y stock

### Precio (USD)
- **Para qué**: Precio en dólares. Almacenado en céntimos, mostrado al
  cliente en su moneda según el cambio.
- **Cómo rellenar**: Decimal (`49.99`). Mínimo `0.01`.
- **Efecto**: Usado en catálogo, carrito, checkout, Stripe Checkout.

### Cantidad en stock
- **Para qué**: Cuántas unidades están listas para envío ahora.
- **Cómo rellenar**: Entero no negativo.
- **Efecto**: `0` → producto marcado como «Agotado», carrito bloqueado.
  Se descuenta automáticamente al confirmar el pedido.

### Tipo de stock
- **Para qué**: Cómo se sirve el producto.
- **Valores**:
  - **En stock** — listo para enviar, descontado del stock
  - **Por encargo** — fabricado tras el pago, requiere
    `Días de producción`
  - **Pieza única** — `Cantidad = 1`, tras vender se archiva
    automáticamente
- **Recomendación**: Para bisutería y joyas en serie — En stock. Para
  personalizadas y custom — Por encargo. Para arte único — Pieza única.

### Días de producción
- **Para qué**: Cuántos días hábiles tarda la elaboración.
- **Cuándo es obligatorio**: Para tipo **Por encargo** (≥ 1).
- **Cómo rellenar**: Entero de días hábiles.
- **Efecto**: Al hacer pedido, fecha del pedido +
  `Días de producción` = fecha límite de la cola de
  [Producción](../orders/production.md).

---

## Sección 3 — Categoría y material

### Categoría
- **Para qué**: Dónde se ubica el producto en el catálogo.
- **Cómo rellenar**: Selecciona de las categorías existentes. Si no
  existe, créala primero en [Categorías](../categories.md).

### Material (opcional)
- **Para qué**: De qué está hecho. Afecta SEO + JSON-LD `Product.material`.
- **Cómo rellenar**: Texto libre. `Cristal checo`, `Plata 925`,
  `Perla natural`.
- **Efecto**: Mostrado en la ficha al cliente; indexado por buscadores.

---

## Sección 4 — Dimensiones (opcional)

Almacenadas en métrico, mostradas a clientes de EE.UU. en imperial
automáticamente.

- **Longitud (cm)** / **Ancho (cm)** / **Alto (cm)** / **Diámetro (cm)**
- **Peso (gramos)** — crítico para pendientes y anillos
- **Tamaño de cuenta (mm)** — para pulseras y collares

**Recomendación**: Al menos peso y una dimensión. Ayuda al SEO y reduce
% de devoluciones.

---

## Sección 5 — Imágenes

- **Para qué**: Lo principal que ve el cliente. La conversión depende
  directamente de la calidad de las fotos.
- **Cómo rellenar**: Drag-and-drop o clic. Hasta 10 imágenes, JPG/PNG/WebP,
  máx. 5 MB cada una. La primera = principal (visible en listings).
- **Recomendación**: Mínimo 3 fotos — fondo blanco (principal), lifestyle
  (en la mano/cuello), macro (detalles). Verticales (3:4), 1500×2000 px.

## Escenarios típicos

**Pulsera en serie en stock — 5 unidades**
Tipo: En stock · Stock: 5 · Días de producción: dejar vacío.

**Anillo por encargo con grabado**
Tipo: Por encargo · Stock: 0 (ignorado) · Días de producción: 7.

**Collar único con piedra encontrada**
Tipo: Pieza única · Stock: 1 (forzado al guardar).

## Avisos

- **No cambies el slug tras publicar** — enlaces externos se rompen.
- **Precio en dólares, almacenado en céntimos** — las conversiones de
  moneda son automáticas.
- **`Días de producción` sin tipo «Por encargo» se ignora** — es el
  comportamiento esperado.

## Secciones relacionadas

- [Resumen de productos](overview.md)
- [Editar producto](edit.md)
- [Categorías](../categories.md)
