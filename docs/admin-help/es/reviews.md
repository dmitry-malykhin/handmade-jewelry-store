# Reseñas

## Para qué sirve

Pantalla de moderación de todas las reseñas de clientes. Tres acciones aquí:

1. **Aprobar** reseñas nuevas para que aparezcan en la página del producto.
2. **Ocultar** spam, mensajes ofensivos o fuera de tema.
3. **Responder públicamente** como vendedor — la respuesta se muestra
   sangrada bajo la reseña del cliente en la página del producto.

Solo se ven las reseñas **Aprobadas**. La media del producto
(`avgRating`, `reviewCount`) se recalcula solo con reseñas Aprobadas —
ocultar una reseña de 5 estrellas baja la media al instante.

## Campos y controles

### Filtro Estado
- Valores: `Todos los estados`, `Pendiente`, `Aprobada`, `Oculta`.
- Las reseñas nuevas empiezan como **Pendiente** — no afectan la página
  del producto hasta que actúes.

### Filtro Valoración
- De 1 a 5 estrellas. Útil para priorizar valoraciones bajas.

### Botones Aprobar / Ocultar
- Uno por fila. El botón del estado actual se oculta — solo ves las
  transiciones que tienen sentido.
- Efecto: inmediato. Las medias del producto se recalculan en la misma
  transacción.

### Responder
- Textarea inline, hasta 2000 caracteres.
- Una vista previa muestra cómo se renderizará la respuesta en la
  página del producto.
- Al guardar se sella `sellerRepliedAt`. Ediciones posteriores
  actualizan el mismo campo — no hay historial de versiones.
- La respuesta **no depende** del estado de la reseña. Puedes preparar
  una respuesta en una Pendiente antes de aprobarla.

## Escenarios típicos

**Llega una reseña nueva**
Filtro `Pendiente` → lee el comentario → Aprobar si es legítimo,
Ocultar si es spam.

**Reseña negativa en un pedido a medida**
Aprobar para que se vea que no ocultas críticas → Responder con
contexto («Hemos reembolsado el pedido, disculpas otra vez»).
La respuesta pública muestra transparencia.

**Detección de spam**
Filtro `Pendiente` + revisión visual de banderas rojas (5 estrellas
sin comentario de cuenta nueva, mismo texto en varios productos).
Ocultar.

## Avisos

- **Ocultar una reseña previamente Aprobada** la quita de la página
  del producto y de `avgRating` al instante.
- **Re-aprobar una Oculta** la vuelve a contar en la media.
- **Sin historial de versiones** para respuestas — la última gana.
  Edita con cuidado las respuestas publicadas.
- **El email del cliente se muestra aquí pero se enmascara
  públicamente** como «Jane d.» en la página del producto.

## Secciones relacionadas

- [Perfil del cliente](customers/profile.md) — todas las reseñas de un cliente
