# LaFerrey Backoffice

Panel donde cada ferretería que vende en la tienda de Shopify de LaFerrey administra **sus** productos, prepara **su parte** de cada orden (pickup o envío) y consulta **sus** ventas.

- Reglas de negocio (fuente de verdad): [`docs/reglas-de-negocio.md`](docs/reglas-de-negocio.md)
- Plan de desarrollo: [`docs/plan-de-desarrollo.md`](docs/plan-de-desarrollo.md)
- Sistema de diseño: [`design-system/laferrey-backoffice/MASTER.md`](design-system/laferrey-backoffice/MASTER.md)

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind v4, shadcn/ui (`base-nova`, Base UI), React Hook Form + Zod 4, Supabase (Auth, Postgres con RLS), Shopify Admin GraphQL `2026-10`, Vitest y pgTAP.

## Cómo está armado

```
Shopify ──Admin API (servidor, filtrada por proveedor)──► Productos (lectura en vivo + CRUD)
   │
   └─ webhooks + cron ─► /api/webhooks/shopify, /api/cron/sync-orders ─► Supabase
                                                                          │ RLS por ferretería
                         Órdenes / Finanzas / Resumen ◄── sesión del usuario ┘
```

- **Acceso.** Supabase Auth sin registro público. `src/proxy.ts` refresca la sesión y redirige; la protección real está en el DAL (`src/lib/auth/dal.ts`), que cada página, server action y route handler vuelve a llamar, y en el RLS de Postgres.
- **Productos.** Se leen y escriben en Shopify desde el servidor. El proveedor y la sucursal salen de la base de datos, nunca del cliente; después de cada consulta se vuelve a verificar el proveedor exacto.
- **Órdenes.** Se copian de Shopify a Supabase (`shopify_orders`, `shopify_order_lines`, `store_orders`). La ferretería solo lee sus filas y solo puede cambiar `store_orders.status`; un trigger valida la transición (RN-19) y otro guarda el historial (RN-22).
- **Finanzas.** Funciones SQL `security invoker` sobre la copia de órdenes (`store_sales_summary`, `store_sales_timeseries`, `store_top_products`).

## Código de recogida (pickup)

Al marcar un pedido de pickup como **Listo para recoger**, el backoffice envía al cliente un correo con un código de 6 dígitos (RN-27). En el mostrador, la ferretería escribe el código que le dicta el cliente para poder marcar **Entregado**.

- La ferretería nunca ve el código ni el correo completo (solo `j***z@gmail.com`). En Supabase se guarda solo un HMAC del código, en una tabla interna (`store_order_pickup_codes`).
- 5 intentos fallidos bloquean el código; **Reenviar código** genera uno nuevo (máximo 5 envíos, 1 minuto entre envíos).
- Si el cliente no puede dar el código, la ferretería entrega **con identificación**: confirma que revisó una identificación oficial y escribe el motivo; queda en el historial.
- La base de datos rechaza "Entregado" de un pickup sin verificar aunque se llame directo a la API (`pickup_not_verified`).
- En Shopify no se marca "listo para recoger" (eso enviaría el correo de Shopify sin código); la orden se etiqueta `listo-recoger:<ferretería>`.

**Gmail.** En la cuenta que enviará los correos activa la verificación en dos pasos, crea una contraseña de aplicación en <https://myaccount.google.com/apppasswords> y ponla en `SMTP_PASSWORD` (los 16 caracteres, sin espacios), con la cuenta en `SMTP_USER`. Gmail limita el número de envíos diarios; si el volumen crece, cambia a un servicio transaccional (solo cambian las variables `SMTP_*`).

**En local** los correos no salen a internet: llegan al buzón de Supabase (Mailpit) en <http://127.0.0.1:54324>.

La app de Shopify necesita acceso a los datos protegidos de clientes, campos **Nombre** y **Email**, para leer el correo del cliente.

## Instalación local

Requisitos: Node 22+, pnpm 11, Docker en ejecución.

```bash
pnpm install
cp .env.example .env          # llena las credenciales de Shopify
pnpm db:start                 # Supabase local en Docker
pnpm exec supabase status     # copia URL, publishable key y secret key al .env
pnpm db:reset                 # aplica las migraciones desde cero
pnpm seed:admin               # crea Mercado Total Ferretero y admin@mercadototal.com
pnpm sync:orders --full       # trae las órdenes de Shopify
pnpm dev
```

`pnpm seed:admin` imprime la contraseña temporal **una sola vez**. Al entrar, el panel obliga a cambiarla. Para restablecerla: `pnpm seed:admin --reset-password`.

> La CLI de Supabase carga el `.env` de la raíz. Por eso las credenciales de la CLI para el proyecto hospedado van en `.env.supabase-cli`, no en `.env`: una `SUPABASE_DB_PASSWORD` en `.env` rompe los comandos contra la base local.

## Variables de entorno

| Variable | Alcance | Notas |
|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | servidor | Dominio canónico: `ubiqat-wz.myshopify.com` (los webhooks llegan con él) |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | servidor | Client ID y secret de la app; el secret también valida la firma de los webhooks |
| `SHOPIFY_PUBLICATION_IDS` | servidor | Canales donde se publican los productos activos (por defecto, Tienda online) |
| `SHOPIFY_FULFILLMENT_SYNC` | servidor | `true` para reflejar en Shopify "listo para recoger", "entregado" y la etiqueta de "listo para enviar" |
| `INCLUDE_TEST_ORDERS` | servidor | `true` en desarrollo, `false` en producción (RN-18) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | público | Las únicas variables que llegan al navegador |
| `SUPABASE_SECRET_KEY` | servidor | `sb_secret_…`; solo sincronización, webhooks, cron, scripts y cambio de contraseña |
| `CRON_SECRET` | servidor | Al menos 32 caracteres; protege `/api/cron/sync-orders` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | servidor | Servidor de correo. Gmail: `smtp.gmail.com`, `465` (TLS). Local: `127.0.0.1`, `54325`, `SMTP_SECURE=false` |
| `SMTP_USER` / `SMTP_PASSWORD` | servidor | Cuenta de Gmail y su contraseña de aplicación (vacíos en local) |
| `EMAIL_FROM` | servidor | Remitente. Solo un nombre (`La Ferrey`) usa la cuenta de `SMTP_USER`; con dirección, en Gmail debe ser la cuenta o un alias verificado. Por defecto `LaFerrey <SMTP_USER>` |
| `PICKUP_CODE_SECRET` | servidor | Al menos 32 caracteres; cifra los códigos de recogida. Si cambia, los códigos pendientes dejan de servir |

`src/lib/env.ts` valida las variables por grupo con Zod y falla con un mensaje claro.

## Scripts

| Script | Qué hace |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js |
| `pnpm typecheck` · `lint` · `test` | TypeScript, ESLint, Vitest |
| `pnpm db:start` · `db:reset` · `db:test` | Supabase local, migraciones desde cero, pruebas pgTAP |
| `pnpm db:types` | Regenera `src/lib/supabase/database.types.ts` |
| `pnpm db:linked <comando>` | CLI de Supabase con las credenciales de `.env.supabase-cli` (`link`, `db push`, `db advisors --linked`…) |
| `pnpm seed:admin [--reset-password]` | Ferretería y cuenta inicial (idempotente) |
| `pnpm sync:orders [--full] [--order <id>]` | Sincroniza órdenes desde el último cursor, todas o una |
| `pnpm shopify:webhooks --url https://<host>` | Registra los webhooks que falten (pide confirmación) |
| `pnpm shopify:enable-pickup [--slug …]` | Activa "Recoger en tienda" en la sucursal de una ferretería (pide confirmación) |
| `pnpm shopify:test-orders [--clean]` | Crea o borra órdenes de prueba (`test: true`, etiqueta `backoffice-seed`); solo desarrollo |

Los scripts corren con `tsx --conditions=react-server` para reutilizar `src/lib/**` (que usa `server-only`).

## Verificación

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm db:test && pnpm build
pnpm exec supabase db advisors --local
```

Las pruebas pgTAP (`supabase/tests/database/`) comprueban el aislamiento entre ferreterías, la máquina de estados, la matriz de transiciones (que coincide con `src/lib/orders/status.ts`) y las cifras de finanzas sobre datos conocidos.

## Prueba manual de punta a punta

1. Sin sesión, `/mercado-total-ferretero` redirige a `/auth`.
2. Entra con `admin@mercadototal.com` y la contraseña temporal: el panel pide una nueva (10+ caracteres, letras y números) y luego lleva a `/mercado-total-ferretero`.
3. `/otra-ferreteria` y `/mercado-total-ferretero/ordenes/123` responden 404.
4. **Productos:** solo aparecen los de proveedor `Mercado Total Ferretero`. Crea un producto `[PRUEBA] …` en Borrador con imagen y existencias, edítalo y elimínalo (el diálogo recomienda archivar).
5. **Órdenes:** `pnpm shopify:test-orders` y `pnpm sync:orders`. En "Por preparar", marca una orden de envío como lista, revísala en el detalle (historial) y regrésala a Preparando. Las líneas de Aldevaram no aparecen.
6. **Pickup:** con el pickup activo, haz una compra en la tienda eligiendo "Recoger en tienda" (con un correo tuyo) y sincroniza. Marca "Listo para recoger": te llega el correo con el código. Prueba un código incorrecto, reenvía el código y marca "Entregado" con el correcto (con `SHOPIFY_FULFILLMENT_SYNC=true` se cierra la entrega en Shopify). Prueba también "No tiene el código".
7. **Finanzas:** las cifras coinciden con la suma de las órdenes del periodo; prueba los atajos, el rango personalizado, la vista de tabla y el CSV.
8. Salir desde el menú de la cuenta lleva a `/auth`.
9. Limpieza: `pnpm shopify:test-orders --clean`.

## Despliegue en Vercel

1. **Supabase hospedado** (ya hecho para `LaFerreyDB`): `pnpm db:linked link --project-ref <ref>`, `pnpm db:linked db push --linked` y `pnpm db:linked db advisors --linked`. Registro público desactivado y contraseñas de 10+ con letras y números.
2. **Proyecto en Vercel**: *Add New → Project*, importa el repo de GitHub. Vercel detecta Next.js; deja los comandos por defecto y elige Node.js 24.x en *Settings → Build and Deployment*. La rama de producción es `main`.
3. **Variables de entorno** (*Settings → Environment Variables*, entorno **Production**). Puedes pegar el contenido de `.env` y luego ajustar:
   - `INCLUDE_TEST_ORDERS=false`.
   - `SHOPIFY_FULFILLMENT_SYNC=true` para que "Entregado" cierre la entrega en Shopify y se etiqueten las órdenes listas.
   - `ENABLE_EXPERIMENTAL_COREPACK=1` para que Vercel use la versión de pnpm de `packageManager`.
   - **No** subas `SUPABASE_ACCESS_TOKEN` ni `SUPABASE_DB_PASSWORD` (solo son para la CLI).
   Las `NEXT_PUBLIC_*` se fijan al compilar: si las cambias, vuelve a desplegar.
4. **Cuenta inicial**: desde tu máquina, con `.env` apuntando al hospedado, `pnpm seed:admin` (la contraseña se muestra una vez).
5. **Supabase Auth**: en *Authentication → URL Configuration*, pon la URL de Vercel como *Site URL* y en *Redirect URLs*.
6. **Webhooks**: `pnpm shopify:webhooks --url https://<tu-app>.vercel.app`.
7. **Reconciliación**: el workflow `.github/workflows/sync-orders.yml` llama a `/api/cron/sync-orders` cada 30 min. En GitHub, *Settings → Secrets and variables → Actions*: secret `CRON_SECRET` (el mismo de Vercel) y variable `APP_URL` (la URL de producción). Pruébalo con *Run workflow*.
8. **Carga inicial de órdenes**: `pnpm sync:orders --full` (sin `read_all_orders`, Shopify solo entrega los últimos 60 días).
9. **App de Shopify**: deja solo los permisos de la sección 4.7 del plan (más `write_locations` si activas pickup en otra sucursal y `write_orders` para las etiquetas de "listo") y los datos protegidos **Nombre** y **Email**.

## Configuración de la tienda que afecta al panel

- **Preparación automática.** Si Shopify tiene activo "preparar automáticamente los artículos del pedido" al pagarse, las órdenes pagadas llegan como Completado/Enviado y la ferretería nunca las prepara. Debe estar desactivado.
- **Productos físicos.** Un producto sin "requiere envío" no ofrece envío ni pickup y Shopify lo da por preparado al pagarse. En el panel es el interruptor "Es un producto físico".
- **Canales.** Los productos activos se publican en `SHOPIFY_PUBLICATION_IDS` (P-07). Si la tienda pública es headless, agrega su publicación.
