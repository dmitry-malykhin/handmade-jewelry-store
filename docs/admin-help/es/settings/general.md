# Ajustes de la tienda

## Para qué sirve

Configuración global de la tienda. Tres secciones en una página, cada
una con su propio botón **Guardar** (guarda solo esa sección, no toda
la página).

1. **General** — identidad (nombre, lema, emails de contacto)
2. **Redes sociales** — enlaces a perfiles, renderizados en el pie
3. **Envío y devoluciones** — política de devolución, estimados de
   entrega, umbral de envío gratis

Los ajustes se guardan como una fila única en la tabla `SiteSettings`
(singleton con `id = "default"`) y se leen en cada request de la
tienda, así que los cambios aparecen al instante en el sitio público.

---

## Sección 1 — General

### Nombre de la tienda
- **Para qué**: Nombre usado en el header, page titles, firmas de
  email, recibos.
- **Cómo rellenar**: 1–120 caracteres. Obligatorio.
- **Efecto**: Cambiar esto actualiza todas las superficies orientadas
  al cliente en la próxima carga. Los `<title>` SEO se reconstruyen en
  el siguiente ISR refresh.

### Lema
- **Para qué**: Oración corta mostrada bajo el logo / hero de inicio.
- **Cómo rellenar**: ≤ 200 caracteres. Opcional pero recomendado.
- **Recomendación**: Una propuesta de valor clara. Por ejemplo
  `Joyería artesanal de cristal checo, enviada a todo el mundo`.

### Email de contacto
- **Para qué**: Inbox público mostrado en la página de contacto y pie.
- **Cómo rellenar**: Email válido o vacío.
- **Efecto**: Es donde los clientes te escribirán. Usa uno que
  realmente revises.

### Email de soporte
- **Para qué**: Donde van las notificaciones de pedidos. Puede ser el
  mismo que contacto — divídelos cuando el volumen justifique un inbox
  separado.
- **Cómo rellenar**: Email válido o vacío.

---

## Sección 2 — Redes sociales

Los cuatro campos aceptan URL `https://` o vacío. Vacío oculta ese
icono en el pie de la tienda.

### URL de Instagram
- **Para qué**: Enlace en pie al perfil de Instagram.
- **Formato**: `https://instagram.com/yourhandle`

### URL de Pinterest
- **Para qué**: Enlace en pie. Pinterest es un canal high-intent para
  joyería — vale la pena rellenarlo si tienes pins.
- **Formato**: `https://pinterest.com/yourhandle`

### URL de Facebook
- **Para qué**: Enlace en pie a la página de Facebook.
- **Formato**: `https://facebook.com/yourpage`

### URL de TikTok
- **Para qué**: Enlace en pie al perfil de TikTok.
- **Formato**: `https://tiktok.com/@yourhandle`

**Efecto para los cuatro**: Campos vacíos quitan el icono del pie
entero (sin enlaces rotos).

---

## Sección 3 — Envío y devoluciones

### Ventana de devolución (días)
- **Para qué**: Plazo de devolución orientado al cliente. Mostrado en
  fichas de producto y página de políticas.
- **Cómo rellenar**: 0–365 días.
- **Recomendación**: `30`. Estándar de industria para joyería artesanal.

### Umbral envío gratis (céntimos)
- **Para qué**: Subtotal a partir del cual el envío es gratis en checkout.
- **Cómo rellenar**: Céntimos (`7500` = $75).
- **Efecto**: Bajo el umbral, el cliente paga envío; en/sobre, gratis.
  Mostrado como barra de progreso en el carrito.
- **Recomendación**: 2–3x del ticket medio.

### Envío estimado mín. (días)
- **Para qué**: Extremo optimista de la ventana de entrega. Mostrado
  como parte de «entrega en X–Y días» en ficha y checkout.
- **Cómo rellenar**: 0–60. Debe ser ≤ máx. días.

### Envío estimado máx. (días)
- **Para qué**: Extremo pesimista — lo que dirías a un cliente que
  pregunta «¿pero en el peor caso?».
- **Cómo rellenar**: 0–60. Debe ser ≥ mín. días.
- **Recomendación**: Más ajustado para piezas en stock (p.ej. `3–7`),
  más amplio para hecho a pedido (p.ej. `10–21`).

---

## Escenarios típicos

**Configuración inicial tras lanzar**
General → nombre, lema, ambos emails → guardar. Redes sociales → llena
los perfiles que realmente uses → guardar. Envío → devolución `30`,
umbral `7500`, entrega `3–7` para baseline de stock → guardar.

**Rebrand**
General → actualiza nombre → guardar. Verifica que el header de la
tienda se actualiza en segundos.

**Retraso de entrega festivo**
Envío → sube máx. días de `7` a `14` → guardar. Estimados de cliente
se actualizan en todas partes al instante.

## Avisos

- **Cada sección se guarda independientemente.** Si editas General y
  Envío en la misma visita, pulsa ambos botones Guardar.
- **Sin «undo» / historial de versiones** — la última escritura gana.
  Para cambios de identidad de marca, haz screenshot de los valores
  previos primero.
- **`mín > máx` en días de entrega está bloqueado** por validación de
  cliente.
- **URLs sociales vacías son la forma de quitar un icono** — no hay
  toggle por icono.
- **Moneda**: precios siempre almacenados en USD céntimos (ver
  `docs/09_MULTI_CURRENCY.md`). La página de ajustes no expone
  selección de moneda.

## Secciones relacionadas

- [Categorías](../categories.md) — la taxonomía se configura aparte
- [Códigos de descuento](../discounts/overview.md)
