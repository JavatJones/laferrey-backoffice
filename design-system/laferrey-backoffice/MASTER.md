# Sistema de diseño — LaFerrey Backoffice

> **Lógica:** al construir una página, revisa primero `design-system/laferrey-backoffice/pages/<página>.md`.
> Si existe, sus reglas **mandan** sobre este archivo. Si no, sigue este archivo.

---

**Proyecto:** LaFerrey Backoffice
**Generado con:** ui-ux-pro-max (`"inventory order management admin dashboard" --design-system --density 8`), 2026-10-14
**Categoría:** Inventory & Stock Management (B2B, panel de operación)
**Decisión aprobada (Javier, 2026-10-14):** conservar la identidad actual de LaFerrey y adoptar del sistema sugerido solo el estilo flat, la densidad de tablero, los colores semánticos de estado y la paleta accesible para gráficas. La paleta "industrial slate" y la tipografía Fira Sans/Fira Code **no** se adoptaron.

**Contexto de uso:** personal de ferretería en mostrador, desde computadora, tablet o celular; mucha información; interfaz en español de México.

---

## Reglas globales

### Paleta

Los tokens viven en `src/app/globals.css` (`:root`) y se usan solo por nombre semántico (`bg-primary`, `text-muted-foreground`, `text-success`…). Nunca colores crudos en componentes.

| Rol | Valor | Token | Uso |
|---|---|---|---|
| Fondo de la app | `#f2f2f2` | `--background` | Fondo general (identidad actual) |
| Texto | `#0a0a0a` | `--foreground` | Texto principal |
| Tarjeta | `#ffffff` | `--card` | Tarjetas, tablas, barra lateral |
| Primario | `#171717` | `--primary` | Botón principal, elemento activo |
| Sobre primario | `#fafafa` | `--primary-foreground` | |
| Apagado | `#f5f5f5` | `--muted` | Fondos secundarios, filas de encabezado |
| Texto apagado | `#5c5c5c` | `--muted-foreground` | Texto de apoyo (contraste 6.4:1 sobre blanco) |
| Borde | `#e5e5e5` | `--border` | Bordes y separadores |
| Éxito | `#036b4e` | `--success` | Listo, entregado, pagado, activo |
| Aviso | `#92400e` | `--warning` | Preparando, pago pendiente |
| Información | `#035e8f` | `--info` | Envío, estados informativos |
| Error | `#b91c1c` | `--destructive` | Cancelado, eliminar, errores |

**Gráficas** (validadas con `scripts/validate_palette.js` de la skill dataviz sobre fondo blanco: CVD ΔE 24.7, contraste ≥ 3:1): serie 1 `#2a78d6` (`--chart-1`, Pickup) y serie 2 `#eb6834` (`--chart-2`, Envío). Los colores de estado nunca se usan como series.

Los cuatro colores de estado tienen al menos 4.5:1 de contraste sobre su propio fondo al 10 %, tanto encima de blanco como del gris de la página (verificado con axe). Las insignias de estado combinan el color con un fondo al 10 % y un anillo al 20 % (`bg-success/10 text-success ring-success/20`), y siempre llevan texto: el color nunca es el único indicador.

### Tipografía

- **Fuente:** Geist (texto y encabezados) y Geist Mono (números de orden, SKU y códigos), cargadas con `next/font`.
- **Logotipo:** "LaFerrey" en `font-black tracking-tight`.
- **Cifras:** siempre `tabular-nums` en tablas, montos y contadores.
- **Escala:** cuerpo 14 px en tablas densas y 16 px en formularios (evita el zoom de iOS); títulos de página `text-2xl font-bold tracking-tight`.

### Densidad y espaciado

*Densidad 8/10, tablero.* Escala de Tailwind: `gap-1`/`gap-2` dentro de controles, `gap-4` entre tarjetas, `gap-6` entre secciones. Contenido con ancho máximo `max-w-7xl` y relleno `px-4 sm:px-6`.

### Áreas táctiles

En pantallas táctiles (`pointer-coarse:`) los botones, entradas y selectores miden al menos 44 px de alto (`min-h-11`), y los botones de solo ícono, 44 × 44 px. En escritorio se conserva la altura compacta de shadcn.

### Sombras

Estilo flat: sin sombras decorativas. Solo los elementos flotantes (menús, diálogos, popovers) usan la sombra del componente de shadcn. Las tarjetas se separan del fondo con el contraste entre blanco y `#f2f2f2` y un anillo de 1 px (`ring-foreground/10`).

---

## Componentes

- **shadcn/ui `base-nova` (Base UI).** Se agregan con la CLI; los triggers personalizados usan `render`, no `asChild`.
- **Formularios:** `FieldGroup` + `Field` + `FieldLabel` + `FieldError`; `data-invalid` en `Field` y `aria-invalid` en el control. Etiqueta visible siempre; el error va junto al campo.
- **Botones con carga:** `Spinner` + `disabled`; sin dobles envíos.
- **Confirmaciones destructivas o finales:** `AlertDialog` (eliminar producto, marcar "Entregado").
- **Avisos:** `toast` de Base UI para resultados de acciones; `Alert` para avisos persistentes en la página.
- **Vacíos:** componente `Empty` con una acción clara.
- **Carga:** `Skeleton` con la forma final del contenido (sin saltos de diseño).
- **Tablas en escritorio, tarjetas en celular** para listas de órdenes y productos.

---

## Estilo

**Flat design:** 2D, líneas limpias, tipografía clara, íconos de Lucide.

**Efectos:** sin gradientes; hover con cambio de color u opacidad; transiciones de 150–200 ms con `ease`; respeta `prefers-reduced-motion`.

---

## Antipatrones (no usar)

- Decoración excesiva, sombras complejas o efectos 3D.
- Emojis como íconos (usa Lucide).
- Hovers que mueven el diseño (sin `scale` en tarjetas de listas).
- Texto con contraste menor a 4.5:1.
- Estados sin transición.
- Foco invisible: el anillo de foco de shadcn no se quita.
- Gradientes morados o rosas.

---

## Checklist antes de entregar

- [ ] Sin emojis como íconos; íconos de Lucide.
- [ ] `cursor-pointer` en todo lo clicable.
- [ ] Hover con transición de 150–300 ms.
- [ ] Contraste de texto de al menos 4.5:1.
- [ ] Foco visible al navegar con teclado.
- [ ] Respeta `prefers-reduced-motion`.
- [ ] Responsivo en 375, 768, 1024 y 1440 px, sin scroll horizontal.
- [ ] Áreas táctiles de al menos 44 px en táctil.
- [ ] Ningún contenido tapado por barras fijas.
