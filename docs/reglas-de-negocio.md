# Reglas de negocio — LaFerrey Backoffice

Fuente de verdad de la lógica de negocio. Si el código contradice este documento, manda el documento; para cambiar una regla, primero se actualiza aquí con el visto bueno de Javier.

Última actualización: 2026-10-14 (código de recogida para pickup: RN-16, RN-19, RN-23 y RN-27).

## 1. Contexto

LaFerrey vende en línea a través de su tienda de Shopify. Las **ferreterías** (proveedores) le entregan productos a LaFerrey para venderlos en esa tienda. Este backoffice es el panel donde cada ferretería:

- administra **sus** productos en Shopify,
- prepara **su parte** de cada orden (pickup o envío),
- consulta **sus** ventas.

Primera ferretería: **Mercado Total Ferretero**.

## 2. Glosario

| Término | Significado |
|---|---|
| Ferretería | Negocio proveedor que vende a través de LaFerrey. |
| Proveedor (vendor) | Campo `vendor` de un producto en Shopify. Indica a qué ferretería pertenece el producto. |
| Sucursal (location) | Ubicación de Shopify donde vive el inventario de la ferretería y donde se recogen sus pedidos de pickup. |
| Cuenta | Usuario que inicia sesión en el panel. |
| Orden | Orden de compra de Shopify. Puede mezclar productos de varias ferreterías y de LaFerrey. |
| Orden de la ferretería | La parte de una orden que le corresponde a una ferretería: solo sus líneas. |
| Línea | Un producto o variante dentro de una orden. |
| Pickup | El cliente eligió recoger en tienda. |
| Envío | Cualquier otro método de entrega: envío a domicilio, entrega local o punto de recogida. |

## 3. Reglas

### Ferreterías y propiedad

- **RN-01 · El proveedor define la propiedad.** Un producto pertenece a una ferretería si y solo si su campo `vendor` en Shopify es el nombre de proveedor de esa ferretería. Para Mercado Total es `Mercado Total Ferretero`. No se usan etiquetas, colecciones ni ningún otro campo para decidir a quién pertenece un producto.
- **RN-02 · Comparación exacta.** Se compara el proveedor completo, ignorando solo mayúsculas/minúsculas y espacios sobrantes. "Mercado Total" no es "Mercado Total Ferretero".
- **RN-03 · Sucursal de la ferretería.** Cada ferretería tiene una sucursal de Shopify, donde vive su inventario y donde los clientes recogen sus pedidos de pickup. Mercado Total Ferretero usa la sucursal "Mercado Total Ferretero".

### Cuentas y acceso

- **RN-04 · Una cuenta, una ferretería.** Por ahora cada cuenta pertenece a exactamente una ferretería. El modelo de datos debe permitir varias en el futuro sin rehacerse.
- **RN-05 · Sin registro público.** Solo LaFerrey crea cuentas. La app no tiene "crear cuenta".
- **RN-06 · Cuenta inicial.** `admin@mercadototal.com`, ligada a Mercado Total Ferretero. Su contraseña temporal es aleatoria, de **8 letras y 2 números**: se genera al crear la cuenta, se muestra una sola vez y nunca se guarda en el repositorio.
- **RN-07 · Cambio de contraseña obligatorio.** Quien entra con contraseña temporal debe definir una nueva antes de usar el panel. La nueva contraseña debe tener al menos 10 caracteres, con letras y números.
- **RN-08 · Aislamiento total.** Una ferretería nunca puede ver ni modificar datos de otra. Al iniciar sesión, la cuenta entra directo al panel de su ferretería (por ejemplo `/mercado-total-ferretero`). Si alguien abre la URL de otra ferretería, o de un producto u orden ajenos, la respuesta es "no encontrado", sin revelar si existe.

### Productos

- **RN-09 · Catálogo filtrado.** La ferretería solo ve los productos de Shopify cuyo proveedor es el suyo (RN-01).
- **RN-10 · Alta, edición y baja.** La ferretería puede crear, editar, archivar y eliminar sus productos en Shopify. Puede manejar los campos que ofrece Shopify: título, descripción, imágenes, tipo de producto, etiquetas, estado, precio, precio de comparación, costo, SKU, código de barras, existencias en su sucursal, seguimiento de inventario, vender sin existencias, peso, si requiere envío, si cobra impuestos, SEO, y opciones con variantes (por ejemplo tamaño o color).
- **RN-11 · Proveedor fijo.** Al crear un producto, el sistema le asigna siempre el proveedor de la ferretería, y desde el panel no se puede cambiar. Nunca se puede editar ni borrar un producto de otro proveedor.
- **RN-12 · Estados del producto.**
  - **Activo:** está a la venta en la tienda en línea.
  - **Borrador:** no está visible.
  - **Archivado:** está oculto, pero se conserva.
  - **No listado:** se puede abrir con su enlace, pero no aparece en búsquedas ni colecciones.

  Un producto nuevo se crea en **Borrador**, salvo que la ferretería elija Activo. Al activarse, se publica en los canales de venta que defina LaFerrey; por defecto, la tienda en línea (ver P-07).
- **RN-13 · Colecciones a cargo de LaFerrey.** El panel no modifica colecciones, ni canales de venta distintos a la tienda en línea, ni plantillas.

### Órdenes

- **RN-14 · Solo órdenes con productos propios.** La ferretería ve una orden únicamente si contiene al menos una línea de su proveedor.
- **RN-15 · Solo sus líneas.** Dentro de una orden, la ferretería solo ve sus líneas: si compraron 3 productos y solo 1 es suyo, solo verá ese. Los montos que ve (subtotal, descuentos y total) se calculan **solo con sus líneas**. Nunca ve las líneas de otros proveedores, el total de la orden completa, el costo de envío ni datos de otras ferreterías.
- **RN-16 · Datos mínimos del cliente.** La ferretería ve el número de orden y el nombre del cliente, que le sirve para identificarlo al entregar un pickup. No ve correo, teléfono ni dirección (ver P-02). El backoffice sí lee el correo del cliente desde Shopify, solo en el servidor, para enviarle el código de recogida (RN-27); a la ferretería solo se le muestra enmascarado (por ejemplo `j***@gmail.com`).
- **RN-17 · Método de entrega visible.** Cada orden de la ferretería indica si es **Pickup** o **Envío**, según lo que eligió el cliente en Shopify para esas líneas.
- **RN-18 · Órdenes de prueba.** Las órdenes marcadas como prueba en Shopify se muestran con la etiqueta "Prueba". En producción no cuentan en finanzas.

### Estados de preparación

Cada orden de la ferretería tiene su propio estado de preparación, independiente del de otras ferreterías en la misma orden.

| Estado | Etiqueta en pantalla | Aplica a |
|---|---|---|
| Preparando | Preparando | todas; es el estado inicial al llegar la orden |
| Listo para recoger | Listo para recoger | pickup |
| Listo para enviar | Listo para enviar | envío |
| Completado | "Entregado" en pickup, "Enviado" en envío | todas |
| Cancelado | Cancelado | todas |

- **RN-19 · Cambios que hace la ferretería.**
  - De Preparando a Listo para recoger, solo si es pickup.
  - De Preparando a Listo para enviar, solo si es envío.
  - De Listo para recoger o Listo para enviar de regreso a Preparando, para corregir un error.
  - De Listo para recoger a Entregado, cuando el cliente recoge (ver P-01), solo después de verificar al cliente con su código de recogida o, como excepción, con identificación (RN-27).
- **RN-20 · Cambios automáticos que llegan de Shopify.**
  - Pasa a **Cancelado** desde cualquier estado si la orden se cancela, o si todas las líneas de la ferretería se eliminan o reembolsan.
  - Pasa a **Completado** si LaFerrey marca en Shopify como preparadas todas las líneas de la ferretería.
  - Regresa a **Preparando** si una edición de la orden agrega líneas nuevas de la ferretería cuando ya estaba lista.
- **RN-21 · Estados finales.** Completado y Cancelado ya no se pueden cambiar desde el panel.
- **RN-22 · Historial.** Cada cambio de estado guarda quién lo hizo, cuándo, de qué estado a cuál y si vino del panel o de Shopify.
- **RN-23 · Aviso al cliente en pickup.** Cuando la ferretería marca un pedido de pickup como Listo para recoger, el **backoffice** le envía al cliente un correo con el aviso y su código de recogida (RN-27); Shopify no envía su propio aviso. Cada ferretería avisa por sus propios productos, porque cada una entrega en su sucursal. En Shopify la orden se etiqueta `listo-recoger:<ferretería>` para que LaFerrey lo vea, y al marcar Entregado se cierra en Shopify la entrega de esas líneas sin avisar al cliente. Este reflejo en Shopify se puede activar y desactivar; el correo con el código se envía siempre.

- **RN-27 · Código de recogida.** Al marcar un pedido de pickup como Listo para recoger se genera un código aleatorio de 6 dígitos para esa orden de la ferretería y se envía al correo del cliente.
  - La ferretería nunca ve el código: solo el cliente lo tiene. Se guarda cifrado (hash con llave secreta) y se compara en el servidor.
  - Para marcar Entregado, la ferretería escribe el código que le dicta el cliente. Si es correcto, la orden pasa a Entregado y queda registrado quién la entregó y cuándo.
  - Tras **5 intentos fallidos** el código se bloquea; se puede **reenviar** uno nuevo (el anterior deja de servir), con un máximo de 5 envíos y al menos 1 minuto entre envíos.
  - Si la orden regresa a Preparando, el código deja de servir; al volver a marcarla lista se envía uno nuevo.
  - **Excepción:** si el cliente no puede dar el código (no tiene acceso a su correo, o la orden no tiene correo), la ferretería puede entregar sin código confirmando que revisó una identificación oficial cuyo nombre coincide con el de la orden y escribiendo el motivo. Queda marcado en el historial para que LaFerrey lo revise.
  - LaFerrey puede cerrar la entrega desde Shopify; en ese caso la sincronización la pasa a Completado sin código (RN-20).

### Finanzas

Las finanzas se calculan **solo con las líneas de la ferretería**, en MXN, por fecha de la orden y con la zona horaria de la tienda (America/Monterrey).

| Métrica | Cómo se calcula |
|---|---|
| Venta bruta | Suma del precio original por la cantidad original de sus líneas |
| Descuentos | Suma del total original menos el total con descuentos |
| Devoluciones y ajustes | Suma de las unidades que se quitaron o reembolsaron, por su precio con descuento |
| **Venta neta** | Suma de las unidades actuales por su precio con descuento |
| Órdenes | Número de órdenes de la ferretería que no están canceladas |
| Unidades | Suma de las unidades actuales |
| Ticket promedio | Venta neta entre número de órdenes |
| Ventas pickup / envío | Venta neta separada por método de entrega |
| Por cobrar | Venta neta de órdenes con pago pendiente, autorizado o parcial |
| Productos más vendidos | Ranking por venta neta y por unidades |

- **RN-24 · Qué no cuenta.** No incluye costos de envío, propinas ni líneas de otros proveedores. Excluye órdenes canceladas y, en producción, órdenes de prueba. Los montos se muestran como los registra Shopify, con o sin impuestos según la configuración de la tienda.
- **RN-25 · Comisiones.** Por ahora no se calcula comisión de LaFerrey ni liquidaciones (ver P-04).

### Formato

- **RN-26** La interfaz es en español de México, en pesos mexicanos (MXN), con formato `es-MX` y zona horaria America/Monterrey.

## 4. Preguntas abiertas

Mientras Javier no decida otra cosa, se construye con el supuesto por defecto.

| # | Pregunta | Supuesto por defecto |
|---|---|---|
| P-01 | ¿Dónde recoge el cliente los pedidos de pickup? | En la sucursal de la ferretería; la ferretería marca "Entregado". |
| P-02 | ¿Quién hace los envíos a domicilio? | LaFerrey recoge los pedidos "Listo para enviar" y hace el envío desde Shopify. La ferretería no necesita la dirección del cliente. |
| P-03 | ¿Los productos nuevos necesitan aprobación de LaFerrey antes de publicarse? | No. La ferretería puede publicarlos; se crean en Borrador por defecto. |
| P-04 | ¿LaFerrey cobra comisión a la ferretería? ¿De cuánto? | Sin comisión en esta versión. |
| P-05 | ¿La ferretería puede eliminar productos definitivamente o solo archivarlos? | Puede hacer ambas cosas, con confirmación; el panel recomienda archivar. |
| P-06 | ¿Habrá una vista para LaFerrey con todas las ferreterías? | Fuera de esta versión. |
| P-07 | ¿En qué canales de venta se publican los productos activos? La tienda tiene Tienda online, Headless, Shop y Point of Sale. | Solo en Tienda online. Si la tienda pública es headless, agregar también Headless. |
