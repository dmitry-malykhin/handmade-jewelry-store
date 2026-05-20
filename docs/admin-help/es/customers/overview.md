# Clientes

## Para qué sirve

Lista de clientes registrados con métricas clave para retención
(número de pedidos, Valor de vida, fecha del último pedido).

**Los invitados no aparecen aquí** — sus checkouts se rastrean en el
pedido mismo, no como registros de cliente. Para encontrar a un
invitado, busca por email en [Pedidos](../orders/overview.md).

Usa esta página para:

- Identificar VIPs por Valor de vida
- Encontrar clientes perdidos (último pedido > N meses) para campañas
  de recuperación
- Abrir el perfil de un cliente para historia completa

## Campos y controles

### Buscar
- **Para qué**: Encontrar un cliente por subcadena de email.
- **Cómo rellenar**: Cualquier parte del email. Sin distinción de
  mayúsculas. Debounce de 300 ms.
- **Efecto**: Reinicia la paginación a 1, recarga la tabla.
- **Truco**: Búsqueda por dominio (`@gmail.com`) para clientes Gmail;
  útil al investigar problemas de entrega con un proveedor.

### Columnas

| Columna | Significado |
|---|---|
| **Email** | Clic → perfil del cliente |
| **Registrado** | Fecha de creación de cuenta |
| **Pedidos** | Conteo de pedidos en cualquier estado no-CANCELADO |
| **Valor de vida** | USD pagados menos reembolsos |
| **Último pedido** | Fecha del más reciente, o `—` si no hay |

### Paginación
20 por página. **Anterior** / **Siguiente**. No hay salto a página
(intencional — fomenta búsqueda en vez de scroll).

## Escenarios típicos

**Outreach a VIP**
Ordena visualmente por Valor de vida (la tabla ya está ordenada) →
primera página = clientes top. Exportación manual por ahora (no hay
botón CSV).

**Targeting de recuperación**
Mira la columna **Último pedido** — quien lleve >90 días en silencio
es candidato para email «te extrañamos». Coteja con segmento en
Klaviyo.

**El cliente pregunta «¿cuánto he gastado?»**
Abre su perfil clic en email → campo **Valor de vida**.

## Avisos

- **El Valor de vida excluye pedidos CANCELADO y REEMBOLSADO.** Para
  reembolsos parciales, el importe reembolsado se resta de la
  contribución del pedido.
- **Contadores de fidelidad / wishlist no se muestran aquí** — están
  en el perfil.
- **La búsqueda solo busca en el campo email.** No se soporta búsqueda
  por nombre.

## Secciones relacionadas

- [Perfil del cliente](profile.md) — vista profunda de un cliente
- [Resumen de pedidos](../orders/overview.md) — para buscar invitados
