# Plan de desarrollo — LaFerrey Backoffice

Creado el 2026-10-14. La lógica de negocio está en [`docs/reglas-de-negocio.md`](./reglas-de-negocio.md) y manda sobre este plan. Aquí se citan sus reglas como `RN-xx` y sus preguntas abiertas como `P-xx`.

## 0. Cómo usar este documento

1. Lee completo este plan y `docs/reglas-de-negocio.md` antes de escribir código.
2. Ejecuta las fases de la sección 6 en orden. Cada una tiene tareas y criterios de aceptación; no empieces una fase si la anterior no los cumple.
3. Al cerrar cada fase: corre las verificaciones (2.6), resume al usuario qué quedó hecho y qué falta, y propón un commit. Haz commits solo si el usuario lo pide.
4. Los datos de la sección 3 se verificaron el 2026-10-14. Si algo no coincide con lo que observes, confía en lo que observes y avísale al usuario.

## 1. Objetivo

Convertir el prototipo actual —un tablero sin inicio de sesión que muestra **toda** la tienda de Shopify— en un backoffice seguro para varias ferreterías:

- **Acceso:** autenticación con Supabase; cada cuenta entra solo al panel de su ferretería (RN-04 a RN-08).
- **Productos:** catálogo de Shopify filtrado por proveedor, con alta, edición, archivado y baja (RN-09 a RN-13).
- **Órdenes:** solo con las líneas de la ferretería, y con flujo de preparación para pickup y envío (RN-14 a RN-23).
- **Finanzas:** tablero de ventas de la ferretería (RN-24, RN-25 y la tabla de métricas).
- **Tecnología:** diseño con shadcn/ui y la skill ui-ux-pro-max; formularios con React Hook Form y Zod; todo en TypeScript.

## 2. Reglas de trabajo

### 2.1 Stack y documentación obligatoria

- **Next.js 16.3 no es el Next.js de tus datos de entrenamiento** (ver `AGENTS.md`). Antes de escribir código de cada tema, lee la guía local en `node_modules/next/dist/docs/01-app/`:
  - **`03-api-reference/03-file-conventions/proxy.md`.** `middleware.ts` ahora se llama `proxy.ts` y exporta una función `proxy`; corre en Node por defecto.
  - **`02-guides/authentication.md`.** Explica el DAL, los DTO y por qué el layout **no basta** para proteger una ruta: no se vuelve a ejecutar al navegar.
  - **`02-guides/data-security.md`, `02-guides/server-actions.md` y `02-guides/forms.md`.**
  - **`03-api-reference/03-file-conventions/error.md`.** La prop del error boundary es `retry`, no `reset`.
  - **`03-api-reference/04-functions/after.md`.** Sirve para hacer trabajo después de responder, como en los webhooks.
  - **`params` y `searchParams` son Promises.** Usa los helpers globales `PageProps<'/ruta'>` y `LayoutProps`, que se generan con `pnpm exec next typegen`.
- **shadcn/ui CLI 4 con estilo `base-nova`, que usa Base UI y no Radix.** Agrega componentes con la CLI, no a mano. En Base UI los triggers personalizados usan `render`, no `asChild`.
- **pnpm 11** es el gestor de paquetes; borra `package-lock.json`, que quedó de create-next-app. Fija versiones y commitea el lockfile.
- **Formularios con React Hook Form + Zod v4** (`@hookform/resolvers`) y los componentes `Field` / `FieldGroup` de shadcn. El mismo esquema Zod valida en el cliente, por experiencia de uso, y **siempre** también en el servidor.
- **Todo en `.ts` / `.tsx`.**

### 2.2 Skills instaladas en `.claude/skills/`

| Skill | Úsala para |
|---|---|
| `supabase` | Todo lo de Supabase: Auth, SSR, CLI, migraciones, RLS. Sigue su checklist de seguridad y revisa `https://supabase.com/changelog.md` antes de implementar. |
| `supabase-postgres-best-practices` | Tablas, índices, políticas RLS y funciones SQL. |
| `shadcn` | Agregar y componer componentes: `Field`/`FieldGroup`, el toast de Base UI y `render`. |
| `ui-ux-pro-max` | Dirección visual, sistema de diseño, UX, accesibilidad y gráficas. |

**Ruta de `ui-ux-pro-max`:** su SKILL.md usa `${CLAUDE_PLUGIN_ROOT}/.claude/skills/...`, pero esa variable está vacía en esta instalación. Ejecuta el script desde la raíz del proyecto:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --design-system -p "LaFerrey Backoffice"
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --stack shadcn
```

### 2.3 Pide confirmación al usuario antes de

- Crear o modificar un proyecto de Supabase hospedado (`supabase link`, `supabase db push`) o crear usuarios en él.
- Crear, editar o borrar productos u órdenes reales en Shopify, cambiar la configuración de la tienda (pickup, sucursales, canales) o registrar webhooks.
- Hacer cambios grandes de identidad visual (paleta o tipografía). Muestra primero la propuesta.
- Resolver una pregunta abierta `P-xx` de forma distinta a su supuesto por defecto.

### 2.4 Secretos

- `SHOPIFY_API_SECRET`, `SUPABASE_SECRET_KEY` y `CRON_SECRET` solo se usan en módulos con `import 'server-only'`. Lo único que puede llegar al navegador es `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- La contraseña temporal de la cuenta inicial se imprime en consola una sola vez. Nunca va en archivos, commits ni logs persistentes.
- `.env.example` no lleva valores secretos.

### 2.5 Convenciones del código existente

- Componentes como arrow functions (`export const OrdersTable = () => {...}`). Páginas como `const XPage = async (...) => {...}` con `export default XPage`.
- Comillas simples en TSX; `cn` se importa desde `@/lib/utils`.
- Los componentes de cada área van en carpetas `(components)`, como en `src/app/(dashboard)/(components)/`.
- Comentarios solo donde el porqué no es obvio. Textos de la interfaz en español de México.

### 2.6 Verificación

Al cerrar cada fase deben pasar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:test` (desde la Fase 1) y `pnpm build`. Si la fase toca la interfaz, prueba los flujos en el navegador.

Para validar consultas GraphQL de Shopify sin tocar la tienda real, `POST https://shopify.dev/admin-graphql-direct-proxy/2026-10` con `{"query": "..."}` responde consultas de **solo lectura**, incluida la introspección, contra una tienda demo. **Nunca** envíes mutaciones ahí. Las consultas de la sección 6 ya se validaron así.

## 3. Estado actual (verificado el 2026-10-14)

### 3.1 Repositorio

- **Stack:** Next.js 16.3.8 (App Router, Turbopack), React 19.2.8, TypeScript estricto, Tailwind v4, lucide-react.
- **UI:** shadcn 4.21 con `base-nova`. En `src/components/ui/` hay `button`, `input`, `card`, `table` y `badge`.
- **Código de Shopify que se reutiliza:**
  - `src/lib/shopify/client.ts` obtiene el token por *client credentials grant* (dura 24 h; se cachea en memoria y se renueva solo) y expone `shopifyAdminQuery<T>()`, `ShopifyError` y mensajes claros para errores de OAuth. Usa la API `2026-10`.
  - `src/lib/shopify/format.ts` tiene formateadores `es-MX` y las etiquetas de estados de Shopify.
  - `src/app/(dashboard)/(components)/shopify/` tiene `OrdersTable`, `ProductsGrid`, `Pagination`, `StatusBadge`, `StatCard` y `SetupNotice`.
- **⚠️ Código que hay que reemplazar porque expone datos de todos los proveedores:**
  - `src/lib/shopify/queries.ts` consulta **todas** las órdenes y productos de la tienda.
  - `src/app/(dashboard)/[hardware_store]/page.tsx` los muestra sin pedir sesión.
- **Otros pendientes:**
  - `src/app/(dashboard)/[hardware_store]/[order_id]/page.tsx` es un stub; se mueve a `ordenes/[order_id]`.
  - `src/app/(auth)/auth/page.tsx` es un login falso: un componente de cliente que hace `router.push("/negociogenerico")`.
  - `src/app/(dashboard)/(components)/navbar/navbar.tsx` tiene un botón de salir que no hace nada.
  - `src/app/layout.tsx` usa `lang="en"` (cambiar a `es`) y tiene un aviso de lint por `geistMono` sin usar.
  - `src/app/globals.css` tiene un bloque `@media (prefers-color-scheme: light)` que define fondo oscuro. Es un bug que hoy queda oculto porque `:root` lo sobrescribe; hay que quitarlo.
- **Configuración:** `next.config.ts` ya permite imágenes de `cdn.shopify.com/s/files/**`.
- **`.env`** (no versionado): `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_API_KEY` (Client ID), `SHOPIFY_API_SECRET` (Client secret) y `SHOPIFY_HEADLESS_KEY`, que está vacía y no se usa.

### 3.2 Tienda de Shopify

- **Tienda:** "LaFerrey", plan **Basic** (es una tienda real, no de desarrollo), moneda MXN, zona horaria America/Monterrey.
- **Dominio:** el canónico es `ubiqat-wz.myshopify.com`. El `.env` usa el alias `laferrey.myshopify.com`, que funciona para la API, pero los webhooks llegan con el canónico en `X-Shopify-Shop-Domain`.
- **Pagos de prueba:** al no ser tienda de desarrollo, no hay Bogus Gateway. Usa el modo de prueba de Shopify Payments o un método de pago manual.
- **App:** es del Dev Dashboard y obtiene el token con *client credentials grant*, que exige que la app y la tienda sean de la misma organización. Hoy tiene casi todos los permisos `write_*`; hay que reducirlos a los de 4.7.
- **Sucursales:**
  - "Mercado Total Ferretero": `gid://shopify/Location/85431091293`, Monterrey.
  - "Principal": `gid://shopify/Location/84373307485`.

  **Ninguna tiene pickup activo** (`localPickupSettingsV2: null`).
- **Productos (2):**
  - "WEDO Destornillador electricista…": proveedor `Mercado Total Ferretero`, $356.23, 15 unidades en la sucursal Mercado Total Ferretero y 0 en Principal.
  - "Asfalto en Frío": proveedor `Aldevaram`, $255.00, 10 unidades en Principal.
- **Órdenes:** 0.
- **Búsqueda por proveedor:** `products(query: "vendor:\"Mercado Total Ferretero\"")` busca la frase exacta. `vendor:Mercado` y `vendor:"mercado total"` no devuelven nada.
- **Canales de venta (publicaciones):**
  - Tienda online: `gid://shopify/Publication/186569490525`.
  - Point of Sale: `…/186569523293`.
  - Shop: `…/186569556061`.
  - Headless: `…/213255749725`.

  Para identificar un canal, consulta `catalog { ... on AppCatalog { apps { nodes { handle } } } }`. La tienda online tiene `handle: "online_store"`; ya no existe `Publication.name` y `catalog.title` no es legible.

### 3.3 Admin API 2026-10 (verificado por introspección)

- **`LineItem`:** `vendor`, `quantity`, `currentQuantity`, `unfulfilledQuantity`, `sku`, `variantTitle`, `image`, `product`, `variant`, `originalUnitPriceSet`, `discountedUnitPriceAfterAllDiscountsSet`, `originalTotalSet`, `discountedTotalSet`, `totalDiscountSet`.
- **`FulfillmentOrder`:**
  - `status`: OPEN, IN_PROGRESS, CANCELLED, INCOMPLETE, CLOSED, SCHEDULED, ON_HOLD.
  - `deliveryMethod.methodType`: SHIPPING, PICK_UP, NONE, RETAIL, LOCAL, PICKUP_POINT.
  - También `assignedLocation.location.id`, `lineItems` (`id`, `remainingQuantity`, `lineItem.id`, `vendor`) y `supportedActions`.
- **Mutaciones:**
  - `productSet(input, synchronous, identifier: {id | handle | customId})`.
  - `productDelete(input, synchronous)`.
  - `publishablePublish(id, input)`.
  - `stagedUploadsCreate(input: [{resource: IMAGE, filename, mimeType, fileSize, httpMethod}])`.
  - `inventorySetQuantities(input: {name, reason, quantities: [{inventoryItemId, locationId, quantity, changeFromQuantity}]})`.
  - `fulfillmentOrderLineItemsPreparedForPickup(input: {lineItemsByFulfillmentOrder: [{fulfillmentOrderId}]})`. **Marca la entrega completa; no acepta líneas sueltas.**
  - `fulfillmentCreate(fulfillment: {lineItemsByFulfillmentOrder: [{fulfillmentOrderId, fulfillmentOrderLineItems: [{id, quantity}]}], notifyCustomer})`. Este sí permite cerrar líneas sueltas.
  - `locationLocalPickupEnable`, `webhookSubscriptionCreate(topic, webhookSubscription: {uri, format, includeFields, filter})`, `tagsAdd`/`tagsRemove`, `orderCreate` y `orderDelete`.
- **Cómo edita `productSet`:**
  - Los campos que no envías **no cambian**.
  - Las listas que **sí** envías (`variants`, `productOptions`, `files`, `metafields`, `collections`) **reemplazan** la lista completa: lo que no incluyas se borra.
  - **No publica** en canales; para eso está `publishablePublish`.
- **Topics de webhook disponibles:** ORDERS_CREATE, ORDERS_UPDATED, ORDERS_CANCELLED, ORDERS_DELETE, ORDERS_EDITED, REFUNDS_CREATE, FULFILLMENT_ORDERS_LINE_ITEMS_PREPARED_FOR_PICKUP y PRODUCTS_*.

### 3.4 Entorno local

- Node 26.5, pnpm 11.10, Docker 29 (el daemon está activo), Python 3.9 y Homebrew.
- La CLI de Supabase **no** está instalada.

## 4. Arquitectura

### 4.1 Flujo de datos

```
                 ┌──────────── Shopify (tienda LaFerrey) ────────────┐
                 │  Productos                     Órdenes            │
                 └─────┬──────────────────────────────┬──────────────┘
   Admin API (server)  │                              │ webhooks + reconciliación
   filtrada por vendor │                              ▼
                       │                 /api/webhooks/shopify ─► orders-sync
                       │                              │ (secret key)
                       ▼                              ▼
          Panel › Productos               Supabase: shopify_orders,
          (lectura en vivo + CRUD)        shopify_order_lines, store_orders
                                                      │ RLS por ferretería
          Panel › Órdenes / Finanzas ◄────────────────┘ (sesión del usuario)
             └─ cambio de estado ─► store_orders (trigger valida)
                                     └─► opcional: Shopify (listo para recoger / entregado)
```

### 4.2 Fuente de verdad

| Dato | Fuente de verdad | Cómo lo lee el panel |
|---|---|---|
| Cuentas, ferreterías, membresías | Supabase | Cliente con la sesión del usuario, filtrado por RLS |
| Productos | Shopify | Admin API desde el servidor, filtrada por `vendor` y con verificación exacta |
| Órdenes y líneas | Shopify, copiadas a Supabase | Supabase con RLS |
| Estado de preparación e historial | Supabase | Supabase con RLS; opcionalmente se refleja en Shopify |
| Finanzas | Se calculan en Postgres sobre la copia | Funciones SQL `security invoker` |

Las órdenes se copian a Supabase en lugar de leerse en vivo por cuatro razones:

- El aislamiento queda en la base de datos con RLS.
- Las líneas se filtran por proveedor en SQL.
- Las agregaciones financieras son rápidas.
- El estado de preparación de cada ferretería vive junto a sus líneas.

### 4.3 Capas de seguridad

1. **Proxy** (`src/proxy.ts`): refresca la sesión con `getClaims()` y redirige a `/auth` si no hay sesión. Es un filtro optimista, no la protección real.
2. **DAL** (`src/lib/auth/dal.ts`): `requireStoreAccess(slug)` se llama en **cada** página, server action y route handler. No basta con el layout.
3. **RLS en Postgres:** toda tabla de `public` tiene RLS activo. Las de la ferretería tienen políticas por membresía; las internas no tienen acceso para `anon` ni `authenticated`.
4. **Shopify solo desde el servidor** (`server-only`). El proveedor y la sucursal salen de la base de datos, nunca del cliente. Antes de editar o borrar se verifica que el recurso sea de la ferretería.
5. **Zod en cliente y servidor:** toda entrada se valida en el servidor, aunque ya se haya validado en el cliente.

### 4.4 Estructura de carpetas objetivo

```
src/
├── proxy.ts                         # refresco de sesión y redirecciones optimistas
├── app/
│   ├── layout.tsx                   # lang="es", fuentes y tokens del sistema de diseño
│   ├── page.tsx                     # "/" → /{slug} o /auth
│   ├── not-found.tsx
│   ├── (auth)/auth/
│   │   ├── page.tsx                 # inicio de sesión
│   │   ├── cambiar-contrasena/page.tsx
│   │   └── actions.ts               # signIn, signOut, changePassword
│   ├── (dashboard)/
│   │   ├── (components)/            # layout/, orders/, products/, finance/, shared/
│   │   └── [hardware_store]/
│   │       ├── layout.tsx           # shell: barra lateral y encabezado
│   │       ├── page.tsx             # resumen
│   │       ├── loading.tsx · error.tsx · not-found.tsx
│   │       ├── ordenes/{page.tsx, [order_id]/page.tsx, actions.ts}
│   │       ├── productos/{page.tsx, nuevo/page.tsx, [product_id]/page.tsx, actions.ts}
│   │       └── finanzas/page.tsx
│   └── api/
│       ├── webhooks/shopify/route.ts
│       └── cron/sync-orders/route.ts
├── components/ui/                   # shadcn (instalados con la CLI)
└── lib/
    ├── env.ts                       # variables validadas con Zod (server-only)
    ├── auth/dal.ts                  # getSessionUser, requireUser, requireStoreAccess
    ├── supabase/
    │   ├── server.ts                # cliente con la sesión del usuario (RLS)
    │   ├── client.ts                # navegador, solo si hace falta
    │   ├── admin.ts                 # secret key, server-only: sync, webhooks, seed
    │   ├── proxy.ts                 # updateSession() para src/proxy.ts
    │   └── database.types.ts        # generado con pnpm db:types
    ├── shopify/
    │   ├── client.ts · format.ts    # ya existen
    │   ├── vendor.ts                # normalizeVendor(), idéntica a la columna generada en SQL
    │   ├── products.ts              # catálogo filtrado y CRUD
    │   ├── orders-sync.ts           # Shopify → Supabase
    │   ├── fulfillment.ts           # listo para recoger / entregado (Fase 5b)
    │   └── webhooks.ts              # verificación HMAC
    ├── orders/{queries.ts, status.ts}
    ├── finance/queries.ts
    └── validations/{auth.ts, product.ts, order.ts, finance.ts}
supabase/{config.toml, migrations/, tests/database/}
scripts/{seed-admin.ts, shopify/{sync-orders.ts, register-webhooks.ts, seed-test-orders.ts}}
design-system/laferrey-backoffice/   # lo genera ui-ux-pro-max con --persist
```

### 4.5 Rutas

| Ruta | Quién accede | Contenido |
|---|---|---|
| `/` | Con sesión | Redirige a `/{slug}`, o a `/auth` sin sesión. Si la cuenta no tiene ferretería, muestra un aviso y el botón de salir. |
| `/auth` | Público; con sesión redirige a `/` | Inicio de sesión. |
| `/auth/cambiar-contrasena` | Con sesión | Cambio obligatorio de la contraseña temporal (RN-07). |
| `/{slug}` | Miembro | Resumen: órdenes por preparar, órdenes listas, venta neta del mes y productos activos. |
| `/{slug}/ordenes` | Miembro | Órdenes de la ferretería, con filtros. |
| `/{slug}/ordenes/{order_id}` | Miembro, si la orden tiene líneas suyas | Detalle, cambio de estado e historial. |
| `/{slug}/productos` | Miembro | Catálogo filtrado por proveedor. |
| `/{slug}/productos/nuevo` | Miembro | Alta de producto. |
| `/{slug}/productos/{product_id}` | Miembro, si el producto es suyo | Edición, archivar y eliminar. |
| `/{slug}/finanzas` | Miembro | Tablero financiero. |
| `POST /api/webhooks/shopify` | Firma HMAC de Shopify | Recibe webhooks de órdenes. |
| `GET /api/cron/sync-orders` | `Authorization: Bearer <CRON_SECRET>` | Reconciliación periódica de órdenes. |

`order_id` y `product_id` son los IDs numéricos de Shopify (`legacyResourceId`). Valídalos con Zod (`^\d+$`) y construye el GID en el servidor, por ejemplo `gid://shopify/Product/<id>`. Los segmentos estáticos (`ordenes`, `productos`, `finanzas`) tienen prioridad sobre los dinámicos.

### 4.6 Variables de entorno

| Variable | Alcance | Valor / notas |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | servidor | `ubiqat-wz.myshopify.com`, el canónico |
| `SHOPIFY_API_KEY` | servidor | Client ID de la app |
| `SHOPIFY_API_SECRET` | servidor | Client secret; también se usa para validar la firma de los webhooks |
| `SHOPIFY_PUBLICATION_IDS` | servidor | GIDs separados por coma de los canales donde se publican los productos activos. Por defecto `gid://shopify/Publication/186569490525` (Tienda online, P-07) |
| `SHOPIFY_FULFILLMENT_SYNC` | servidor | `false` hasta terminar la Fase 5b |
| `INCLUDE_TEST_ORDERS` | servidor | `true` en desarrollo y `false` en producción (RN-18) |
| `NEXT_PUBLIC_SUPABASE_URL` | público | En local, `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | servidor | `sb_secret_…`; nunca en el cliente |
| `CRON_SECRET` | servidor | Cadena aleatoria larga |

### 4.7 Permisos de la app de Shopify

| Permiso | Para qué |
|---|---|
| `read_orders` | Sincronizar órdenes |
| `read_all_orders` | Opcional: traer órdenes de hace más de 60 días |
| `read_products`, `write_products` | Catálogo y CRUD |
| `read_inventory`, `write_inventory` | Existencias en la sucursal |
| `read_locations` | Sucursales |
| `read_publications`, `write_publications` | Publicar en los canales de venta |
| `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders` | Método de entrega, "listo para recoger" y "entregado" |
| `write_files` | Solo si `stagedUploadsCreate` lo exige para imágenes; verifícalo en la documentación |
| `write_orders` | **Solo en desarrollo**, para el script de órdenes de prueba y el etiquetado opcional de la Fase 5b. Quítalo en producción si no se usa el etiquetado. |
| Datos protegidos de clientes: nivel 1, campo **Nombre** | Para `customer.displayName` (RN-16). Sin este permiso el nombre llega como `null` y se muestra "—". |

Quita todos los demás permisos.

## 5. Base de datos (Supabase)

Las migraciones se crean con `pnpm exec supabase migration new <nombre>`. Sigue las skills `supabase` y `supabase-postgres-best-practices`.

### 5.1 Enums

- `member_role`: `owner`, `staff`.
- `delivery_method`: `pickup`, `shipping`, `local_delivery`, `pickup_point`, `retail`, `none`.
  - Viene de `FulfillmentOrder.deliveryMethod.methodType`: `PICK_UP` → `pickup`, `SHIPPING` → `shipping`, `LOCAL` → `local_delivery`, y así con los demás.
  - Para las reglas y la interfaz, **pickup** es `pickup` y **envío** es todo lo demás.
- `preparation_status`: `preparing`, `ready_for_pickup`, `ready_to_ship`, `completed`, `cancelled`.

### 5.2 Tablas

**`hardware_stores`** — ferreterías

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `slug` | `text` not null unique | `check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')` |
| `name` | `text` not null | |
| `shopify_vendor` | `text` not null | Exactamente como en Shopify (RN-01) |
| `shopify_vendor_key` | `text` unique | `generated always as (lower(regexp_replace(btrim(shopify_vendor), '\s+', ' ', 'g'))) stored` (RN-02) |
| `shopify_location_id` | `text` | GID de la sucursal (RN-03) |
| `is_active` | `boolean` not null | `default true` |
| `created_at`, `updated_at` | `timestamptz` not null | `default now()` + trigger de `updated_at` |

**`profiles`**

- `id uuid` PK que referencia `auth.users` con `on delete cascade`.
- `full_name text`.
- `must_change_password boolean not null default false`.
- `created_at`, `updated_at`.
- Se crea con un trigger `after insert on auth.users`, cuya función vive en el esquema `private`.

**`hardware_store_members`**

- `user_id` → `auth.users` y `hardware_store_id` → `hardware_stores`, ambas con `on delete cascade`.
- `role member_role not null default 'owner'`.
- `created_at`.
- PK `(user_id, hardware_store_id)`.
- **`unique (user_id)`**, que implementa RN-04. Se quita cuando se permitan varias ferreterías por cuenta.

**`shopify_orders`** (interna: solo la usa el service role)

- `id bigint` PK (`legacyResourceId`), `gid text unique`, `name`.
- Fechas: `processed_at`, `shopify_created_at`, `shopify_updated_at`, `cancelled_at`, `cancel_reason`, `closed_at`.
- Estado: `is_test`, `financial_status`, `fulfillment_status`.
- Otros: `currency`, `customer_display_name`, `source_name`, `synced_at`.

**`shopify_order_lines`** (la ferretería solo lee las suyas)

- Identidad: `gid text` PK, `order_id bigint` → `shopify_orders` con `on delete cascade`.
- Ferretería: `hardware_store_id uuid null` → `hardware_stores` con `on delete set null`. Vale `null` si el proveedor no corresponde a ninguna ferretería; así quedan, por ejemplo, las líneas de Aldevaram.
- Producto: `vendor`, `product_gid`, `variant_gid`, `title`, `variant_title`, `sku`, `image_url`.
- Cantidades: `quantity`, `current_quantity`, `unfulfilled_quantity`.
- Montos, en `numeric(12,2)`: `original_unit_price`, `discounted_unit_price`, `original_total`, `discounted_total`.
- Entrega: `delivery_method`, `fulfillment_order_gid`, `fulfillment_order_line_item_gid`, `location_gid`.
- Índice `(hardware_store_id, order_id)`.

**`store_orders`** (la orden de cada ferretería; la ferretería la lee y **solo** puede cambiar `status`)

- Identidad: PK `(order_id, hardware_store_id)`, cada una con FK y `on delete cascade`.
- Copia de la orden: `order_name`, `processed_at`, `customer_display_name`, `financial_status`, `is_test`, `order_cancelled_at`, `delivery_method not null`, `currency`.
- Agregados de sus líneas: `lines_count`, `units`, y en `numeric(12,2)` `gross_amount`, `discount_amount`, `refunded_amount`, `net_amount`.
- Estado: `status preparation_status not null default 'preparing'`, `status_changed_at`, `status_changed_by uuid null`.
- Sincronización con Shopify: `shopify_push_status text null`, con check `in ('pending','ok','failed','skipped')`, y `shopify_push_error text`.
- `created_at`, `updated_at`.
- Índices: `(hardware_store_id, processed_at desc)` y `(hardware_store_id, status)`.

**`store_order_status_events`** (historial, RN-22)

- `id bigint generated always as identity` PK.
- `(order_id, hardware_store_id)` → `store_orders`, con `on delete cascade`.
- `from_status`, `to_status`, `changed_by uuid null`.
- `source text`, con check `in ('panel','shopify')`.
- `created_at`.

**`shopify_webhook_events`** (interna; da idempotencia)

- `event_id text` PK, `topic`, `shop_domain`, `resource_gid`.
- `status`, con check `in ('received','processed','failed')`.
- `error`, `received_at`, `processed_at`.

**`shopify_sync_state`** (interna)

- `key text` PK, por ejemplo `'orders'`.
- `cursor timestamptz`, que es el `updatedAt` máximo sincronizado.
- `last_run_at`, `last_error`.

### 5.3 RLS y privilegios

Activa RLS en **todas** las tablas de `public`. Da los permisos de forma explícita en cada migración: no dependas de que la Data API exponga las tablas nuevas automáticamente.

```sql
-- Esquema no expuesto por la Data API, para funciones privilegiadas
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Ferreterías de la cuenta actual. Es SECURITY DEFINER para no depender del RLS
-- de hardware_store_members (evita recursión). Vive en `private`: no es invocable por la API.
create function private.current_user_store_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.hardware_store_id
  from public.hardware_store_members m
  where m.user_id = (select auth.uid())
$$;
revoke all on function private.current_user_store_ids() from public;
grant execute on function private.current_user_store_ids() to authenticated;

-- Patrón de lectura para store_orders, shopify_order_lines y store_order_status_events
-- (en hardware_stores la condición es sobre `id`).
create policy "store members can read" on public.store_orders
  for select to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()));

-- La ferretería solo puede escribir la columna status; el trigger de 5.4 valida la transición.
create policy "store members can update status" on public.store_orders
  for update to authenticated
  using (hardware_store_id in (select private.current_user_store_ids()))
  with check (hardware_store_id in (select private.current_user_store_ids()));

revoke all on public.store_orders from anon, authenticated;
grant select on public.store_orders to authenticated;
grant update (status) on public.store_orders to authenticated;
```

- **`hardware_store_members`:** select con `user_id = (select auth.uid())`.
- **`profiles`:** select con `id = (select auth.uid())`. No tiene política de update; `must_change_password` lo cambia el servidor con el cliente admin.
- **Tablas internas** (`shopify_orders`, `shopify_webhook_events`, `shopify_sync_state`): RLS activo, sin políticas y con `revoke all ... from anon, authenticated`.
- **`anon`** no tiene acceso a nada.
- **Vistas:** si creas alguna, usa `with (security_invoker = true)`.

### 5.4 Máquina de estados (RN-19 a RN-22)

```sql
create function private.guard_store_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  is_pickup boolean := new.delivery_method = 'pickup';
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  -- actor nulo = proceso del sistema (sync con service role): aplica RN-20.
  -- Con usuario autenticado solo se permiten las transiciones de RN-19.
  if actor is not null and not (
       (old.status = 'preparing' and new.status = 'ready_for_pickup' and is_pickup)
    or (old.status = 'preparing' and new.status = 'ready_to_ship' and not is_pickup)
    or (old.status in ('ready_for_pickup', 'ready_to_ship') and new.status = 'preparing')
    or (old.status = 'ready_for_pickup' and new.status = 'completed' and is_pickup)
  ) then
    raise exception 'invalid_status_transition' using errcode = 'P0001';
  end if;

  new.status_changed_at := now();
  new.status_changed_by := actor;
  return new;
end;
$$;

create trigger store_orders_guard_status
  before update of status on public.store_orders
  for each row execute function private.guard_store_order_status();
```

Además, una función `private.log_store_order_status()` con `security definer` y `set search_path = ''` inserta en `store_order_status_events`. Guarda `source = 'panel'` si `auth.uid()` existe y `'shopify'` si no. Se conecta con dos triggers:

- `after insert on store_orders`, que registra `null → preparing`.
- `after update of status ... when (old.status is distinct from new.status)`.

La matriz de transiciones se replica en TypeScript (`src/lib/orders/status.ts`) para mostrar solo los botones válidos. Una prueba debe confirmar que las dos versiones coinciden.

### 5.5 Funciones de finanzas (RN-24 y tabla de métricas)

Las tres llevan `language sql stable security invoker set search_path = ''` y `revoke execute ... from anon`. Filtran por `hardware_store_id = p_store_id`, `processed_at >= p_from and processed_at < p_to`, `status <> 'cancelled'` y `(p_include_test or not is_test)`. Como son `security invoker`, el RLS sigue aplicando.

- **`public.store_sales_summary(p_store_id, p_from, p_to, p_include_test)`** devuelve:
  - `net_amount`, `gross_amount`, `discount_amount`, `refunded_amount`.
  - `orders`, `units`, `avg_ticket`.
  - `pickup_net`, `pickup_orders`, `shipping_net`, `shipping_orders`.
  - `pending_payment_net`, que es la venta neta con `financial_status in ('PENDING','AUTHORIZED','PARTIALLY_PAID')`.
- **`public.store_sales_timeseries(p_store_id, p_from, p_to, p_bucket, p_include_test)`** devuelve `bucket date`, `net_amount`, `pickup_net`, `shipping_net` y `orders`. `p_bucket` es `day`, `week` o `month`, y agrupa con `processed_at at time zone 'America/Monterrey'`.
- **`public.store_top_products(p_store_id, p_from, p_to, p_limit, p_include_test)`** devuelve `product_gid`, `title`, `units` y `net_amount`.

### 5.6 Pruebas de base de datos (pgTAP con `supabase test db`)

Crea fixtures con dos ferreterías, A y B, y un usuario en cada una. Simula cada sesión con `set local role authenticated` y `set local request.jwt.claims`. Comprueba que:

1. A solo ve su ferretería, su membresía, sus `store_orders`, sus líneas y su historial. B lo análogo. `anon` no ve nada.
2. A no puede leer `shopify_orders`, `shopify_webhook_events` ni `shopify_sync_state`.
3. Si A intenta cambiar el `status` de una orden de B, se actualizan 0 filas.
4. Si A intenta actualizar otra columna, como `net_amount`, falla por permisos.
5. Las transiciones válidas pasan, las inválidas lanzan `invalid_status_transition`, y cada cambio deja un evento con `changed_by`.
6. Sin `auth.uid()` (sistema) se puede pasar a `cancelled` y a `completed`.
7. Las funciones de finanzas devuelven los totales correctos de las fixtures y solo los de la ferretería.

## 6. Fases

### Fase 0 — Preparación del entorno

1. **Lee la documentación.** Revisa la de 2.1 y las skills de 2.2.
2. **Pregunta por Supabase.** Averigua si el usuario ya tiene un proyecto de Supabase hospedado. El plan es empezar en local con Docker (`supabase start`) y enlazar el hospedado en la Fase 8, o antes si el usuario lo prefiere.
3. **Limpia.** Borra `package-lock.json`, pon `lang="es"`, quita el bloque CSS con el bug y el import sin usar.
4. **Instala las dependencias,** con versiones fijas:
   ```bash
   pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers server-only
   pnpm add -D supabase tsx vitest
   ```
   pnpm 11 bloquea los scripts de instalación, y la CLI de Supabase descarga su binario en `postinstall`. Agrega `supabase: true` en `allowBuilds` de `pnpm-workspace.yaml` y comprueba `pnpm exec supabase --version`; `db advisors` necesita la versión 2.81.3 o mayor.
5. **Inicia Supabase y configura Auth.** Corre `pnpm exec supabase init` y, en `supabase/config.toml`:
   - Pon `site_url = "http://localhost:3000"`.
   - Desactiva el registro (`enable_signup = false` en `[auth]` y en `[auth.email]`).
   - Define la contraseña: mínimo 10 caracteres, con letras y números (RN-07).

   Verifica los nombres exactos de esas claves en la documentación actual; la skill `supabase` advierte que cambian. Luego corre `pnpm exec supabase start` y copia la URL y las llaves *publishable* y *secret* de `pnpm exec supabase status` al `.env`.
6. **Configura las variables de entorno.**
   - Crea `.env.example` sin secretos.
   - Agrega `!.env.example` al `.gitignore`, porque hoy `.env*` lo ignora.
   - Crea `src/lib/env.ts` con `server-only`, que valide con Zod las variables del servidor y falle con un mensaje claro.
7. **Agrega los scripts a `package.json`:**
   ```json
   "typecheck": "tsc --noEmit",
   "test": "vitest run",
   "db:start": "supabase start",
   "db:reset": "supabase db reset",
   "db:test": "supabase test db",
   "db:types": "supabase gen types typescript --local > src/lib/supabase/database.types.ts",
   "seed:admin": "tsx --conditions=react-server --env-file=.env scripts/seed-admin.ts",
   "sync:orders": "tsx --conditions=react-server --env-file=.env scripts/shopify/sync-orders.ts",
   "shopify:webhooks": "tsx --conditions=react-server --env-file=.env scripts/shopify/register-webhooks.ts",
   "shopify:test-orders": "tsx --conditions=react-server --env-file=.env scripts/shopify/seed-test-orders.ts"
   ```
   `--conditions=react-server` hace que `import 'server-only'` funcione fuera de Next; para eso el paquete `server-only` tiene que estar instalado explícitamente. Así los scripts reutilizan `src/lib/**`. Verifica que funcione.

   En Vitest, configura el alias `@` → `src` y apunta `server-only` a un módulo vacío.
8. **Configura la app de Shopify (lo hace el usuario en dev.shopify.com).**
   - Dale al usuario los pasos: crear una versión de la app con los permisos de 4.7 y los datos protegidos (Nombre), publicarla y aceptar los permisos en la tienda.
   - Espera a que confirme y verifica el campo `scope` de la respuesta del token.
   - Cambia `SHOPIFY_STORE_DOMAIN` a `ubiqat-wz.myshopify.com`.

**Criterios de aceptación:**

- `pnpm typecheck`, `pnpm lint` y `pnpm build` pasan.
- `supabase start` levanta sin errores.
- El token de Shopify trae los permisos nuevos.
- `.env.example` está versionado y sin secretos.

### Fase 1 — Base de datos

1. Lee las skills de Supabase y revisa el changelog.
2. Crea las migraciones de la sección 5:
   - **`tenancy`:** esquema `private`, `member_role`, `hardware_stores`, `profiles` con su trigger, `hardware_store_members`, trigger de `updated_at`, RLS y permisos.
   - **`orders_mirror`:** enums de entrega y estado, las tablas de órdenes, índices, RLS, permisos y los triggers de 5.4.
   - **`finance_functions`:** las funciones de 5.5.
3. Aplica todo desde cero con `pnpm db:reset`.
4. Corre `pnpm exec supabase db advisors` y deja **cero** avisos de seguridad.
5. Genera los tipos con `pnpm db:types` y úsalos en los clientes (`createServerClient<Database>`).
6. Escribe las pruebas pgTAP de 5.6 en `supabase/tests/database/`.

**Criterios de aceptación:**

- Las migraciones aplican limpias desde cero.
- Los advisors no reportan avisos.
- `pnpm db:test` pasa.
- Los tipos están generados.

### Fase 2 — Sistema de diseño y autenticación

**2.1 Sistema de diseño** (skill `ui-ux-pro-max`)

1. **Genera la propuesta:**
   ```bash
   python3 .claude/skills/ui-ux-pro-max/scripts/search.py "B2B backoffice dashboard hardware store orders inventory" --design-system --density 8 -p "LaFerrey Backoffice"
   ```
   Contexto para elegir: lo usa personal de ferretería en mostrador, desde computadora, tablet o celular; manejan muchos datos; la interfaz está en español.
2. **Presenta la propuesta al usuario** (paleta, tipografía, estilo) y espera su visto bueno.
3. **Guárdala** con `--persist --output-dir .`, que crea `design-system/laferrey-backoffice/MASTER.md`, y agrega `--page` para órdenes, productos y finanzas si hace falta.
4. **Aplica los tokens** como variables de `:root` en `src/app/globals.css` y las fuentes con `next/font` en `layout.tsx`. Respeta la identidad actual (logotipo "LaFerrey" en `font-black`, fondo `#f2f2f2`, tarjetas blancas) salvo que el usuario apruebe cambiarla.
5. **Consulta las guías del stack** con `--stack shadcn` y `--stack nextjs`.
6. **Agrega los componentes con la CLI.** Revisa antes `pnpm dlx shadcn@latest info`. Necesitarás `field`, `label`, `textarea`, `select`, `checkbox`, `switch`, `dialog`, `alert-dialog`, `dropdown-menu`, `sheet`, `sidebar`, `separator`, `skeleton`, `tooltip`, `avatar`, `tabs`, `breadcrumb`, `pagination`, `popover`, `calendar`, `chart` y el toast que la skill `shadcn` indique para Base UI. Puedes partir de bloques (`login-*`, `sidebar-*`, `dashboard-01`) y adaptarlos.

**2.2 Clientes de Supabase**

- Crea `src/lib/supabase/{server.ts, client.ts, admin.ts, proxy.ts}` siguiendo la guía oficial actual de SSR para Next.js. Cualquier página de la documentación de Supabase se puede descargar en Markdown agregando `.md` a la URL.
- En el servidor **nunca** uses `getSession()`; usa `getClaims()`.
- `admin.ts` usa la secret key, lleva `server-only` y se crea con `auth: { persistSession: false, autoRefreshToken: false }`.

**2.3 `src/proxy.ts`**

- El matcher excluye `_next/static`, `_next/image`, `favicon.ico`, las imágenes, `api/webhooks` y `api/cron`.
- Siempre refresca la sesión y devuelve la respuesta con las cookies actualizadas.
- Sin sesión en una ruta protegida, redirige a `/auth?next=<ruta>`.
- Con sesión en `/auth`, redirige a `/`. `/auth/cambiar-contrasena` requiere sesión.

**2.4 DAL (`src/lib/auth/dal.ts`, con `server-only` y `cache()` de React)**

- `getSessionUser()` devuelve `{ id, email }` o `null`, usando `getClaims()`.
- `requireUser()` redirige a `/auth` si no hay sesión.
- `getUserStore()` devuelve la membresía y la ferretería como DTO: `{ id, slug, name, vendor, locationId }`.
- `requireStoreAccess(slug)`:
  1. Exige sesión.
  2. Busca la ferretería por `slug` con el cliente de la sesión, así que el RLS solo deja ver la propia. Si no la encuentra, llama a `notFound()`.
  3. Si `profiles.must_change_password` es verdadero, redirige a `/auth/cambiar-contrasena`.
  4. Devuelve `{ user, store }`.

**2.5 Pantallas y acciones** (`src/app/(auth)/auth/actions.ts`, esquemas en `src/lib/validations/auth.ts`)

- **Inicio de sesión.**
  - Formulario con RHF, `zodResolver` y `Field`.
  - La acción `signIn(values)` valida con Zod y llama a `signInWithPassword`.
  - Si falla, muestra un mensaje genérico: "Correo o contraseña incorrectos".
  - Si funciona y hay contraseña temporal, redirige a `/auth/cambiar-contrasena`. Si no, redirige a `next`, solo si es una ruta relativa que empieza con `/`, no con `//` ni con `/auth`; en otro caso, a `/{slug}`.
- **Cambiar contraseña.**
  - Pide la contraseña nueva y su confirmación, con la política de RN-07.
  - La acción llama a `auth.updateUser({ password })`, luego pone `must_change_password = false` con el cliente admin y redirige a `/{slug}`.
- **Salir.** La acción `signOut()` cierra la sesión y redirige a `/auth`. Conéctala al botón de salir del shell.
- **`/`.** Usa `getUserStore()` y redirige. Si la cuenta no tiene ferretería, muestra "Tu cuenta no tiene una ferretería asignada. Contacta a LaFerrey." con el botón de salir.

**2.6 Script de la cuenta inicial** (`scripts/seed-admin.ts`, con el cliente admin, idempotente)

1. **Ferretería:** hace upsert de `{ slug: 'mercado-total-ferretero', name: 'Mercado Total Ferretero', shopify_vendor: 'Mercado Total Ferretero', shopify_location_id: 'gid://shopify/Location/85431091293' }`.
2. **Contraseña temporal:** si `admin@mercadototal.com` no existe, la genera con `crypto.randomInt`. Tiene **8 letras y 2 números**, al menos una mayúscula y una minúscula, y no usa letras ambiguas como `I`, `l`, `O` u `o` (RN-06).
3. **Usuario:** lo crea con `auth.admin.createUser({ email, password, email_confirm: true })`, pone `must_change_password = true` y lo agrega como `owner` de la ferretería.
4. **Salida:** imprime la contraseña **una sola vez**, con la advertencia de cambiarla al entrar. Nunca la escribe en disco.
5. **Si el usuario ya existe,** no toca la contraseña, salvo que se ejecute con `--reset-password`.

**Criterios de aceptación:**

- Sin sesión, `/mercado-total-ferretero` redirige a `/auth`.
- Al entrar con la contraseña temporal, la app obliga a cambiarla y después lleva a `/mercado-total-ferretero`.
- `/otra-ferreteria` responde 404.
- Con sesión, `/auth` redirige al panel.
- Salir funciona.
- `supabase.auth.signUp` desde el cliente falla porque el registro está desactivado.

### Fase 3 — Panel y rutas protegidas

1. **Shell en `[hardware_store]/layout.tsx`.**
   - Barra lateral con Resumen, Órdenes, Productos y Finanzas; nombre de la ferretería; menú de cuenta con la opción de salir.
   - En celular, la barra va dentro de un `Sheet`.
   - El layout pide sus datos con `requireStoreAccess`, pero **cada página lo vuelve a llamar**.
2. **Quita las vistas globales.**
   - Borra o reescribe `src/lib/shopify/queries.ts` para que ninguna ruta pueda traer órdenes o productos de toda la tienda.
   - Ajusta o borra `SetupNotice`; `env.ts` ya valida la configuración.
3. **Mueve el detalle de orden** de `[order_id]` a `ordenes/[order_id]`.
4. **Resumen** con tarjetas de indicadores que se conectan en las Fases 5 a 7. Por ahora muestra los productos activos con `productsCount(query: "vendor:\"…\" status:active")`.
5. **Estados de pantalla en español:** `not-found.tsx`, `error.tsx` (con `retry`), `loading.tsx` con skeletons, breadcrumbs y encabezados de página.

**Criterios de aceptación:**

- La navegación funciona en escritorio y en celular.
- Cada página bajo `[hardware_store]` llama a `requireStoreAccess`.
- Ningún archivo de `src/app/` importa consultas globales de Shopify.

### Fase 4 — Sincronización de órdenes (Shopify → Supabase)

1. **Consultas,** ya validadas contra el esquema 2026-10. Úsalas en `src/lib/shopify/orders-sync.ts`:
   ```graphql
   fragment OrderForSync on Order {
     id legacyResourceId name processedAt createdAt updatedAt cancelledAt cancelReason closedAt test
     displayFinancialStatus displayFulfillmentStatus currencyCode sourceName
     customer { displayName }
     lineItems(first: 250) {
       nodes {
         id vendor title variantTitle sku quantity currentQuantity unfulfilledQuantity
         product { id } variant { id } image { url }
         originalUnitPriceSet { shopMoney { amount } }
         discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount } }
         originalTotalSet { shopMoney { amount } }
         discountedTotalSet { shopMoney { amount } }
       }
       pageInfo { hasNextPage endCursor }
     }
     fulfillmentOrders(first: 50) {
       nodes {
         id status
         deliveryMethod { methodType }
         assignedLocation { location { id } }
         lineItems(first: 250) { nodes { id remainingQuantity totalQuantity lineItem { id } } }
       }
     }
   }
   query OrderForSync($id: ID!) { order(id: $id) { ...OrderForSync } }
   query OrdersUpdatedSince($first: Int!, $after: String, $query: String) {
     orders(first: $first, after: $after, query: $query, sortKey: UPDATED_AT) {
       nodes { ...OrderForSync }
       pageInfo { hasNextPage endCursor }
     }
   }
   ```
   Para `OrdersUpdatedSince`, usa `query: "updated_at:>'<ISO>'"`. Si una orden tiene más de 250 líneas, pagínalas. Si Shopify responde `THROTTLED`, reintenta con espera creciente.
2. **Mapeo puro `mapOrderForSync(order, stores)`,** sin efectos secundarios y con pruebas unitarias. Devuelve la fila de la orden, las líneas y las órdenes por ferretería.
   - **Ferretería de cada línea:** se obtiene con `normalizeVendor(line.vendor)`, que debe dar exactamente lo mismo que `shopify_vendor_key`. Si no coincide con ninguna, `hardware_store_id` queda en `null`.
   - **Datos de entrega de cada línea:** se cruzan `fulfillmentOrders.lineItems.lineItem.id` con las líneas para obtener `delivery_method`, `fulfillment_order_gid`, `fulfillment_order_line_item_gid` y `location_gid`.
   - **Montos por ferretería:** se calculan con las definiciones de RN-24 y la tabla de métricas, usando decimales en texto o centavos enteros; nunca `float`.
   - **Método de entrega de la orden de la ferretería:** si todas sus líneas tienen el mismo, ese. Si se mezclan, `pickup` gana y se registra una advertencia.
   - **Estado automático (RN-20):**
     - `cancelled` si la orden está cancelada o si las unidades actuales de la ferretería suman 0.
     - `completed` si todas sus líneas con `currentQuantity > 0` tienen `unfulfilledQuantity = 0`.
     - `preparing` si estaba lista y aparecieron líneas nuevas suyas.
     - En cualquier otro caso, sin cambio.
3. **Guardado** con el cliente admin; debe ser idempotente.
   1. Upsert de `shopify_orders`.
   2. Upsert de las líneas por `gid`, y borrado de las líneas de esa orden que ya no vienen.
   3. Upsert de `store_orders` **sin** la columna `status`: al insertar queda `preparing`, al actualizar no se toca.
   4. Si el estado automático cambia, un `update({ status })` aparte, para que el trigger lo registre con `source = 'shopify'`.
   5. Con `ORDERS_DELETE`, se borra la orden y la cascada borra el resto.
4. **Funciones de entrada:** `syncOrderById(gid)` y `syncOrdersUpdatedSince(cursor)`. La segunda guarda el cursor en `shopify_sync_state`.
5. **Webhook `POST /api/webhooks/shopify`:**
   1. Lee el cuerpo crudo con `await request.text()`.
   2. Verifica la firma: `X-Shopify-Hmac-Sha256` debe ser el base64 del HMAC-SHA256 del cuerpo con `SHOPIFY_API_SECRET`, comparado con `crypto.timingSafeEqual`.
   3. Verifica que `X-Shopify-Shop-Domain` sea el dominio canónico.
   4. Garantiza idempotencia con `X-Shopify-Event-Id` (o `X-Shopify-Webhook-Id` si no viene) en `shopify_webhook_events`; si ya se procesó, responde 200.
   5. Responde 200 rápido y procesa con `after(() => syncOrderById(payload.admin_graphql_api_id))`.
   6. Marca el evento como `processed` o `failed`.
6. **Cron `GET /api/cron/sync-orders`:** valida `Authorization: Bearer <CRON_SECRET>` con comparación de tiempo constante, ejecuta `syncOrdersUpdatedSince` y responde un resumen en JSON.
7. **Scripts:**
   - **`pnpm sync:orders [--full]`.**
   - **`pnpm shopify:webhooks --url https://<host>`** lista las suscripciones y crea las que falten: ORDERS_CREATE, ORDERS_UPDATED, ORDERS_CANCELLED, ORDERS_DELETE, ORDERS_EDITED y REFUNDS_CREATE, con `uri: <host>/api/webhooks/shopify`. Necesita una URL pública (el despliegue, o un túnel como `cloudflared tunnel --url http://localhost:3000`). **Pide confirmación.** En desarrollo basta con `pnpm sync:orders`.
   - **`pnpm shopify:test-orders`** (solo desarrollo, necesita `write_orders`; **pide confirmación**):
     - Crea unas 8 órdenes con `orderCreate`, `test: true` y la etiqueta `backoffice-seed`.
     - Combina el destornillador WEDO (Mercado Total) con el Asfalto en Frío (Aldevaram), con cantidades distintas, pagos `PAID` y `PENDING`, y `options: { inventoryBehaviour: BYPASS, sendReceipt: false, sendFulfillmentReceipt: false }`.
     - `--clean` borra con `orderDelete` las órdenes con esa etiqueta.
     - `orderCreate` no puede simular pickup. Para probarlo, activa el pickup en la sucursal de Mercado Total, con `locationLocalPickupEnable` o desde el admin, y haz una compra de prueba en la tienda eligiendo "Recoger en tienda".

**Criterios de aceptación:**

- Con las órdenes de prueba sincronizadas, `store_orders` de Mercado Total tiene solo sus líneas y sus montos. Las líneas de Aldevaram quedan con `hardware_store_id = null`.
- Una firma inválida responde 401.
- Un evento repetido no se procesa dos veces.
- Las pruebas del mapeo cubren:
  - orden con varios proveedores
  - pickup
  - envío
  - reembolso parcial
  - cancelación
  - orden ya preparada
  - proveedor sin ferretería

### Fase 5 — Órdenes de la ferretería

Antes de empezar, confirma P-01 y P-02 con el usuario.

1. **Consultas** en `src/lib/orders/queries.ts`, siempre con el cliente de la sesión:
   - Lista con filtros por estado, método de entrega, rango de fechas y número de orden.
   - Paginación.
   - Conteo por estado, para las pestañas.
2. **Lista `/{slug}/ordenes`.**
   - Pestañas: Por preparar, Listas, Completadas, Canceladas y Todas.
   - Filtro Pickup/Envío y búsqueda.
   - Tabla en escritorio y tarjetas en celular.
   - Columnas: número, fecha, cliente, método (insignia con ícono: tienda para pickup, camión para envío), estado, pago, unidades y total de la ferretería.
   - Botón de acción rápida en cada fila.
   - Las órdenes de prueba llevan la etiqueta "Prueba".
3. **Detalle `/{slug}/ordenes/{order_id}`.**
   - Busca la orden con `store_orders` por `(order_id, store.id)` y responde `notFound()` si no existe.
   - Muestra encabezado, línea de progreso del estado, botones solo para las transiciones válidas (`status.ts`), las líneas de la ferretería con su total, y el historial.
   - Pide confirmación con `AlertDialog` antes de marcar "Entregado".
4. **Acción `updateOrderStatus({ slug, orderId, to })`.**
   1. Valida con Zod y llama a `requireStoreAccess`.
   2. Actualiza con el cliente de la sesión: `.update({ status: to }).eq('order_id', …).eq('hardware_store_id', store.id).select()`.
   3. Si actualiza 0 filas, responde 404. Si la base de datos lanza `invalid_status_transition`, muestra un mensaje claro.
   4. Termina con `revalidatePath` y un toast.
   5. Opcional: `useOptimistic`.
5. **Fase 5b: reflejar el estado en Shopify** (`src/lib/shopify/fulfillment.ts`, activa solo con `SHOPIFY_FULFILLMENT_SYNC=true`).
   - **Requisito:** el pickup debe estar activo en la sucursal de la ferretería. **Pide confirmación** antes de activarlo.
   - **Listo para recoger:** para cada entrega con `PICK_UP` en estado OPEN o IN_PROGRESS que contenga líneas de la ferretería, llama a `fulfillmentOrderLineItemsPreparedForPickup` **solo si** todas las ferreterías con líneas en esa entrega ya están en `ready_for_pickup` (RN-23). Shopify avisa al cliente.
   - **Entregado:** llama a `fulfillmentCreate` con las líneas de la ferretería (`fulfillmentOrderLineItems: [{ id, quantity }]`) y `notifyCustomer: false`.
   - **Listo para enviar, opcional:** `tagsAdd(orderGid, ['listo-envio:<slug>'])`, y `tagsRemove` si se revierte, para que LaFerrey lo vea en Shopify. Requiere `write_orders`.
   - **Resultado:** se guarda en `shopify_push_status` y `shopify_push_error` con el cliente admin. Si falla, la interfaz avisa y ofrece "Reintentar"; el estado en Supabase se mantiene.

**Criterios de aceptación:**

- Las transiciones siguen la matriz de RN-19.
- Una transición inválida hecha directo contra la Data API falla en la base de datos.
- La orden de otra ferretería responde 404.
- El Resumen muestra los conteos reales.
- Si P-01 está confirmado y el pickup activo, una compra de prueba con pickup recorre todo el flujo.

### Fase 6 — Productos (CRUD)

Antes de empezar, confirma P-03, P-05 y P-07. Para probar, usa productos con título `[PRUEBA] …` en Borrador y bórralos al final, con confirmación del usuario.

1. **`src/lib/shopify/products.ts`** (`server-only`):
   - `buildVendorProductQuery(vendor, { search, status })` escapa `\` y `"`, pone el término de búsqueda entre comillas y combina con `vendor:"…"`. Tiene pruebas unitarias.
   - `listStoreProducts`, `getStoreProduct` y las mutaciones `createStoreProduct`, `updateStoreProduct`, `setStoreProductStatus`, `deleteStoreProduct`, `createImageUploadTargets` y `publishProduct`.
   - **Defensa en profundidad:** después de cada consulta, filtra con `normalizeVendor(product.vendor) === store.vendorKey`. `getStoreProduct` devuelve `null` si el producto no es de la ferretería.
   - **Consultas validadas:** para la lista, `products(query, sortKey: UPDATED_AT, reverse: true)` con `featuredMedia.preview.image`, `priceRangeV2`, `totalInventory`, `variantsCount` y `productsCount(query)`. Para editar, `options.optionValues`, `media(first: 20)` y `variants(first: 100)` con `inventoryItem { tracked requiresShipping unitCost measurement.weight inventoryLevels.quantities(names: ["available"]) }`.
2. **Esquema Zod `src/lib/validations/product.ts`,** compartido por cliente y servidor:
   - **Datos generales:**
     - `title`: de 1 a 255 caracteres.
     - `descriptionHtml`: se **sanea en el servidor** con lista blanca, por ejemplo con `sanitize-html`, para permitir solo `p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `h2`–`h4` y `a[href]`. La tienda muestra este HTML tal cual, así que sin sanear habría riesgo de XSS.
     - `productType`, `tags[]`, `status` (`ACTIVE`, `DRAFT`, `ARCHIVED`, `UNLISTED`) y `seo { title ≤ 70, description ≤ 320 }`.
   - **Opciones y variantes:**
     - `options[]`: hasta 3, cada una con `name` y `values[]`.
     - `variants[]`, cada una con:
       - `id?`, `optionValues`.
       - Precio: `price` en decimal como texto y mayor a 0; `compareAtPrice`, opcional y mayor que `price`.
       - Identificadores: `sku`, `barcode`.
       - Inventario: `cost`, `tracked`, `inventoryPolicy` (`DENY` o `CONTINUE`), `quantity` (entero ≥ 0).
       - Envío e impuestos: `weight { value, unit }`, `requiresShipping`, `taxable`.
   - **Imágenes:** hasta 10, en jpg, png o webp, de máximo 20 MB, con `alt`.
3. **Formulario** con RHF, `zodResolver` y `useFieldArray`.
   - Secciones: General, Imágenes, Precio, Inventario, Envío, Variantes, SEO y Estado.
   - Dos modos: producto simple (una variante) y producto con variantes.
4. **Acciones** (`productos/actions.ts`).
   - Cada acción sigue estos pasos:
     1. `requireStoreAccess(slug)`.
     2. Validación con Zod.
     3. Verificación de propiedad, para editar, cambiar estado o borrar.
     4. La mutación, con `vendor = store.vendor` y `locationId = store.locationId`, **nunca** tomados de la entrada.
     5. Los `userErrors` de Shopify se traducen a errores de campo.
     6. `revalidatePath`.
   - **Crear:** `productSet(synchronous: true)` con `vendor`, `files`, `productOptions` y `variants` con `inventoryQuantities: [{ locationId, name: 'available', quantity }]`. Si queda `ACTIVE`, se publica con `publishablePublish` en `SHOPIFY_PUBLICATION_IDS`.
   - **Editar:** `productSet(identifier: { id })` enviando **las listas completas**: variantes con su `id` e imágenes existentes con su `id` más las nuevas. **Nunca** envíes `collections`. Verifica si `inventoryQuantities` aplica al editar; si no, usa `inventorySetQuantities`. Prueba primero con un producto en Borrador.
   - **Archivar:** cambia `status` a `ARCHIVED`. **Eliminar:** `productDelete`, con `AlertDialog` que recomiende archivar.
   - **Imágenes:**
     1. `createImageUploadTargets` valida tipo y tamaño y llama a `stagedUploadsCreate(resource: IMAGE, httpMethod: POST)`.
     2. El navegador sube el archivo directo a la URL temporal que entrega Shopify, como multipart con los `parameters` más el archivo.
     3. El `resourceUrl` se manda como `originalSource` en `files`.
5. **Lista `/{slug}/productos`.**
   - Tabla o cuadrícula con imagen, título, estado, precio, existencias, SKU y fecha de actualización.
   - Búsqueda, filtro por estado y paginación por cursor.
   - Menú de acciones: Editar, Archivar y Eliminar.
   - Estado vacío con el botón "Agregar producto".

**Criterios de aceptación:**

- Mercado Total ve solo el destornillador WEDO y no el Asfalto en Frío.
- Un producto creado en Borrador aparece en Shopify con proveedor `Mercado Total Ferretero` y existencias en su sucursal.
- Editar conserva las variantes y las imágenes.
- Un producto ajeno abierto por URL, o enviado con un ID alterado, responde 404.
- El proveedor no cambia aunque se envíe en el payload.

### Fase 7 — Finanzas

Antes de empezar, confirma P-04.

1. **`src/lib/finance/queries.ts`** llama a las funciones de 5.5 con el cliente de la sesión.
   - El rango de fechas viene en los searchParams (`?desde=YYYY-MM-DD&hasta=YYYY-MM-DD`), se valida con Zod y se interpreta en America/Monterrey.
   - Atajos: hoy, 7 días, 30 días, este mes, mes anterior, este año y personalizado.
   - `p_include_test` toma el valor de `INCLUDE_TEST_ORDERS`.
2. **Página `/{slug}/finanzas`.**
   - Tarjetas: venta neta, venta bruta, descuentos, devoluciones, órdenes, unidades, ticket promedio y por cobrar.
   - Comparativo pickup contra envío, en venta y en órdenes.
   - Serie de tiempo de la venta neta por día o semana, separada por método de entrega. Usa `chart` de shadcn.
   - Tabla de productos más vendidos.
   - Opcional: variación contra el periodo anterior y exportación a CSV desde un route handler que también pase por el DAL.
3. **Gráficas:** elígelas con `--domain chart` de ui-ux-pro-max. Deben tener colores accesibles, leyenda, tooltip y formato `es-MX`.

**Criterios de aceptación:**

- Las cifras coinciden con un cálculo manual sobre fixtures conocidas, con una prueba automatizada.
- Solo aparecen datos de la ferretería.

### Fase 8 — QA, seguridad y despliegue

1. **Seguridad:** recorre punto por punto la checklist de la sección 7.
   - Corre `supabase db advisors`.
   - Intenta un IDOR a mano, cambiando el slug o los IDs.
   - Después de `pnpm build`, confirma que ningún secreto llegó al cliente con `grep -rE "sb_secret|SHOPIFY_API_SECRET" .next/static`.
2. **Accesibilidad y responsive:** sigue la checklist de `ui-ux-pro-max` (`references/quick-reference.md` y `references/pro-rules.md`): teclado, contraste, áreas táctiles de al menos 44 px y uso en celular.
3. **Documentación:** un README con la instalación, las variables de entorno, los scripts y una prueba manual de punta a punta.
4. **Despliegue** (pide confirmación en cada paso):
   - **Supabase hospedado:**
     - Corre `supabase link --project-ref <ref>` y `supabase db push`.
     - En el dashboard, desactiva el registro, define la política de contraseñas y configura el *site URL* y las redirecciones.
     - Corre `pnpm seed:admin` contra producción; la contraseña se muestra una vez.
   - **Hosting** (por ejemplo, Vercel): configura las variables de entorno.
   - **Webhooks:** regístralos con la URL de producción.
   - **Cron de reconciliación:** Vercel Cron, que con menos de un día de intervalo requiere plan Pro, Supabase Cron (`pg_cron` + `pg_net`) o GitHub Actions.
   - **Ajustes finales:** `INCLUDE_TEST_ORDERS=false`, y quita `write_orders` si no se usa el etiquetado.

## 7. Checklist de seguridad

- [ ] Ningún secreto en el bundle del cliente; solo dos variables `NEXT_PUBLIC_*`.
- [ ] Cada página, server action y route handler autentica (DAL), autoriza (membresía) y valida con Zod. Nunca acepta `store_id`, `vendor` ni `location` del cliente.
- [ ] RLS activo en todas las tablas de `public`; las pruebas pgTAP demuestran el aislamiento; `anon` no tiene permisos.
- [ ] Las funciones `SECURITY DEFINER` solo viven en `private`, con `search_path = ''` y `EXECUTE` revocado a `public`.
- [ ] Vistas, si existen, con `security_invoker = true`.
- [ ] El cliente admin (secret key) solo se usa en sync, webhooks, cron, seed y en el cambio de `must_change_password`.
- [ ] Productos: búsqueda por proveedor más verificación exacta; propiedad verificada antes de editar o borrar; proveedor forzado al crear; HTML de la descripción saneado.
- [ ] Órdenes: el panel solo lee `store_orders` y `shopify_order_lines` con la sesión del usuario, nunca directo de Shopify.
- [ ] Un recurso ajeno responde 404, sin revelar si existe.
- [ ] Webhooks: HMAC en tiempo constante sobre el cuerpo crudo, dominio verificado e idempotencia.
- [ ] Cron protegido con `CRON_SECRET` en tiempo constante.
- [ ] Registro público desactivado, política de contraseñas, cambio obligatorio de la temporal y `next` validado contra redirecciones abiertas.
- [ ] Datos mínimos del cliente (RN-16).
- [ ] Permisos mínimos en la app de Shopify (4.7).
- [ ] Versiones fijas y lockfile versionado.

## 8. Fuera de alcance de esta versión

- Vista de administrador de LaFerrey con todas las ferreterías (P-06).
- Varias ferreterías por cuenta e invitación de usuarios.
- Recuperación de contraseña por correo; por ahora LaFerrey la restablece con `pnpm seed:admin --reset-password`.
- Comisiones y liquidaciones (P-04).
- Avisos a la ferretería de órdenes nuevas, por correo, push o Realtime.
- Gestión de colecciones, varias monedas y punto de venta.

## 9. Referencias

- **Next.js:** `node_modules/next/dist/docs/01-app/` (ver 2.1).
- **Supabase:**
  - SSR con Next.js: https://supabase.com/docs/guides/auth/server-side/nextjs (agrega `.md` para leerla en Markdown).
  - Changelog: https://supabase.com/changelog.md
  - Seguridad: https://supabase.com/docs/guides/security/product-security.md
- **Shopify Admin GraphQL 2026-10:** https://shopify.dev/docs/api/admin-graphql/2026-10
  - Mutaciones: `productSet`, `stagedUploadsCreate`, `publishablePublish`, `inventorySetQuantities`, `fulfillmentOrderLineItemsPreparedForPickup`, `fulfillmentCreate`, `webhookSubscriptionCreate`, `orderCreate`.
- **Shopify, autenticación:**
  - Client credentials grant: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
  - Verificación HMAC de webhooks: https://shopify.dev/docs/apps/build/webhooks/subscribe/https
- **shadcn + React Hook Form:** https://ui.shadcn.com/docs/forms/react-hook-form
