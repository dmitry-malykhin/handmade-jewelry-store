# Productos

## Para qué sirve

Catálogo completo. Aquí aparecen todos los productos, sin importar su
estado — Activo, Borrador o Archivado. En la tienda pública solo se ven
los **Activos**.

Usa esta página para:

- Crear un producto nuevo (botón **Nuevo producto**, arriba a la derecha)
- Buscar un producto por título o SKU
- Cambiar el estado (Activo / Borrador / Archivado)
- Abrir el formulario de edición
- Eliminar productos que nunca se vendieron

## Campos y controles

### Buscar por título o SKU
- **Para qué**: Encontrar un producto concreto.
- **Cómo rellenar**: Subcadena del título o SKU. Sin distinción de
  mayúsculas. Debounce de 300 ms.
- **Efecto**: Reinicia la paginación a 1, recarga la tabla.

### Filtrar por estado
- **Para qué**: Reducir la lista a un solo estado.
- **Valores**: `Todos los estados`, `Activo`, `Borrador`, `Archivado`.
- **Recomendación**: `Activo` para el trabajo diario; `Borrador` para
  encontrar fichas a medias; `Archivado` para auditorías.

### Columna Estado (dropdown)
- **Para qué**: Cambiar el estado desde la tabla — clic en el badge → elegir.
- **Efecto**: Guardado inmediato. Los clientes verán el cambio tras el
  ISR-revalidate (máx. 1 hora) o al volver a entrar.

### Acción «Editar»
- **Para qué**: Abrir el formulario completo de edición.
- **Efecto**: Navega a una página independiente.

### Acción «Eliminar»
- **Para qué**: Borrado total del producto.
- **Cuándo**: Solo para productos sin historial de pedidos. En caso
  contrario, ponlo en **Archivado** para preservar la historia.

## Columnas de la tabla

| Columna | Significado |
|---|---|
| **Título** | Texto + enlace a edición |
| **Estado** | Activo / Borrador / Archivado (clic → dropdown) |
| **Precio** | En USD, formato `$X.XX` |
| **Stock** | Número (en stock) o `—` (hecho a pedido) |
| **SKU** | SKU o `—` |
| **Creado** | Fecha de creación |

## Escenarios típicos

**Crear un producto nuevo**
**Nuevo producto** → formulario → completa los campos obligatorios →
**Crear producto**. Ver [Crear producto](create.md).

**Retirar temporalmente un producto**
Clic en estado → **Cambiar a Borrador**. Los clientes dejan de verlo;
la página SEO devolverá 410 Gone con el tiempo.

**Vendido definitivamente**
Clic en estado → **Cambiar a Archivado**. Se conserva el historial,
la ficha desaparece del catálogo público.

## Avisos

- **Solo puedes eliminar productos sin historial.** Si hubo aunque sea
  un pedido, el botón eliminar dará error. Usa **Archivado**.
- **Cambiar el slug tras publicar rompe enlaces externos** (Google
  Shopping, Pinterest, ads). Solo modifica si vas a configurar redirect.
- **ISR del catálogo = 1 hora** — los cambios de estado/precio pueden
  tardar hasta una hora en propagarse a páginas públicas.

## Secciones relacionadas

- [Crear producto](create.md)
- [Editar producto](edit.md)
- [Inventario](inventory.md) — gestión rápida de existencias
- [Categorías](../categories.md)
