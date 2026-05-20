# Categorías

## Para qué sirve

Gestionar la taxonomía del catálogo — los grupos que los clientes
filtran en la página de tienda (`Anillos`, `Collares`, `Pulseras`, …).

Cada producto pertenece exactamente a **una** categoría. Las categorías
aparecen en la navegación de la tienda, breadcrumbs, y JSON-LD del
producto. Su `slug` es parte de la URL canónica:
`/shop?categorySlug=rings`.

Usa esta página para:

- Añadir una categoría nueva al lanzar una línea de productos
- Renombrar una categoría (regenera slug si lo dejas vacío)
- Eliminar una categoría (solo cuando esté vacía — ver «Avisos»)

## Campos y controles

### Nombre
- **Para qué**: Etiqueta legible. Mostrada en nav, breadcrumbs, filtros.
- **Cómo rellenar**: Inicial mayúscula, singular o plural — consistente
  con las existentes. `Anillos`, no `anillo` o `ANILLOS`.
- **Efecto**: Visible al cliente. Obligatorio.

### Slug (opcional, generado si está vacío)
- **Para qué**: Identificador URL-safe. Usado en URLs de filtros y SEO.
- **Cómo rellenar**: kebab-case, minúsculas, sin espacios.
  `anillos-de-compromiso`, no `Anillos de Compromiso`. Vacío →
  autogenerado del nombre.
- **Efecto**: **Cambiar el slug rompe todos los enlaces externos** a
  la categoría (buscadores, pins, ads). Tras publicar, considéralo
  inmutable salvo que estés listo para redirects.
- **Recomendación**: Deja autogenerar al primer guardado. Edita solo
  si el slug no es obvio.

### Productos (columna solo lectura)
- **Para qué**: Cuántos productos hay actualmente en esta categoría.
- **Efecto**: Categorías con `> 0` productos **no pueden eliminarse** —
  reasigna o archiva los productos primero.

### Botón «Nueva categoría»
- **Para qué**: Abrir el formulario de creación.
- **Cómo rellenar**: Nombre (obligatorio) + slug (opcional). Submit.

### Acción «Editar» (lápiz)
- **Para qué**: Abrir formulario de edición.
- **Efecto**: Al guardar se actualiza la categoría en vivo
  inmediatamente.

### Acción «Eliminar» (papelera)
- **Para qué**: Borrado total de la categoría.
- **Cuándo**: Solo cuando `Productos = 0`.
- **Efecto**: Irreversible. La categoría desaparece de la tienda
  inmediatamente.

## Escenarios típicos

**Lanzando una línea nueva — «Tobilleras»**
**Nueva categoría** → Nombre `Tobilleras` → slug vacío → guardar.
Luego edita productos existentes para asignarles la nueva categoría.

**Renombrar «Anillos» a «Todos los anillos»**
Editar → Nombre `Todos los anillos` → **deja el slug como `rings`**
para preservar URLs. Guardar.

**Retirar una categoría descontinuada**
Mueve todos los productos a otra categoría (editando cada uno) →
elimina.

## Avisos

- **No puedes tener dos categorías con el mismo slug.** El backend
  rechaza con error de constraint visible como toast.
- **Lista de categorías vacía** = mensaje «Aún no hay categorías».
  Las tiendas nuevas empiezan así; añade al menos una antes de crear
  productos.
- **Cambios de slug no disparan redirects.** Limitación conocida —
  si debes renombrar tras lanzar, añade redirect manualmente en
  `next.config.js`.
- **Las categorías son planas — sin jerarquía padre/hijo.** No se
  soportan subcategorías en esta versión.

## Secciones relacionadas

- [Resumen de productos](products/overview.md) — asignar productos
- [Editar producto](products/edit.md) — cambiar categoría de un producto
