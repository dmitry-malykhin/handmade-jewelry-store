# Inventario

## Para qué sirve

Monitor de existencias del catálogo. Dos funciones que la página normal
**Productos** no tiene:

1. **Alertas de stock bajo** — productos con stock ≤ al umbral
   configurado destacados en rojo.
2. **Edición inline del stock** — clic en el número → editar sin abrir
   el formulario del producto.

El enlace **Inventario** en la barra lateral muestra un badge rojo
cuando hay productos en stock por debajo del umbral. Se refresca cada
2 minutos (o inmediatamente tras una edición aquí).

## Campos y controles

### Alertar cuando stock ≤
- **Para qué**: Umbral para alertas de stock bajo. Predeterminado `3`.
- **Cómo rellenar**: Entero, típicamente 1–10.
- **Efecto**: El badge de barra lateral cuenta productos con stock ≤ este
  valor. Demasiado alto — spam de alertas; demasiado bajo — reposición
  tardía.
- **Recomendación**: `3` para joyas en serie, `1` para artículos de
  movimiento lento.

### Solo stock bajo (toggle)
- **Para qué**: Filtra la tabla a productos con alerta.
- **Cuándo activar**: Al preguntarte «¿qué necesito reponer ahora?».

### Columna Existencias (edición inline)
- **Para qué**: Clic en el número → se abre input → nuevo valor →
  Enter o clic fuera = guardar. Escape = cancelar.
- **Efecto**: Guardado sin confirmación. El badge de barra lateral se
  actualiza inmediatamente.

## Qué cuenta como «stock bajo»

Solo productos con tipo **En stock**. Los productos **Por encargo** y
**Pieza única** están excluidos — para ellos `0` es estado normal.

## Escenarios típicos

**Revisión diaria de existencias**
Abre la página, mira el badge en la barra lateral. Si `0` — todo en
orden. Si no, activa **Solo stock bajo** y actualiza tras el recuento
físico en el taller.

**Ajuste de umbral**
Un fin de semana ocupado agotó 3 productos. O baja el umbral (menos
alertas), o entrénate para reaccionar en cuanto aparezca el badge.

## Avisos

- **Stock 0 en producto En stock** — alertado (umbral `<=`). Decide:
  reponer o pasar a **Archivado**.
- **Cambio de tipo tras publicación** — pasar de «En stock» a
  «Por encargo» retira el producto del inventario automáticamente.

## Secciones relacionadas

- [Resumen de productos](overview.md)
- [Editar producto](edit.md) — formulario completo tras la edición inline
