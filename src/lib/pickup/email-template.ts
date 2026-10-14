// Correo "Tu pedido está listo para recoger" con el código (RN-23, RN-27).
// Todo dato que viene de Shopify se escapa: nombres de productos y del cliente los
// escribe gente fuera del panel.

export type PickupEmailInput = {
  customerName: string | null
  orderName: string
  storeName: string
  code: string
  address: string | null
  items: { title: string; variantTitle: string | null; quantity: number }[]
  resent?: boolean
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const itemLabel = (item: PickupEmailInput['items'][number]) =>
  `${item.quantity} × ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ''}`

export const buildPickupEmail = (input: PickupEmailInput) => {
  const greeting = input.customerName ? `Hola, ${input.customerName}:` : 'Hola:'
  const subject = input.resent
    ? `Nuevo código para recoger tu pedido ${input.orderName}`
    : `Tu pedido ${input.orderName} está listo para recoger`
  const spacedCode = `${input.code.slice(0, 3)} ${input.code.slice(3)}`

  const text = [
    greeting,
    '',
    input.resent
      ? `Este es tu nuevo código para recoger tu pedido ${input.orderName}. El código anterior ya no sirve.`
      : `Tus productos de ${input.storeName} del pedido ${input.orderName} ya están listos para recoger.`,
    '',
    `Tu código de recogida: ${spacedCode}`,
    '',
    `Dónde: ${input.storeName}${input.address ? `, ${input.address}` : ''}`,
    'Presenta este código y una identificación oficial en el mostrador. Si alguien más recoge por ti, compártele el código.',
    '',
    'Productos:',
    ...input.items.map((item) => `- ${itemLabel(item)}`),
    '',
    'No compartas este código con nadie más. La ferretería nunca te lo pedirá por teléfono ni por mensaje.',
    '',
    'LaFerrey',
  ].join('\n')

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f2;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px">
          <tr><td style="font-size:22px;font-weight:900;letter-spacing:-0.5px">LaFerrey</td></tr>
          <tr><td style="padding-top:20px;font-size:16px;line-height:24px">
            <p style="margin:0 0 12px">${escapeHtml(greeting)}</p>
            <p style="margin:0">${
              input.resent
                ? `Este es tu nuevo código para recoger tu pedido <strong>${escapeHtml(input.orderName)}</strong>. El código anterior ya no sirve.`
                : `Tus productos de <strong>${escapeHtml(input.storeName)}</strong> del pedido <strong>${escapeHtml(input.orderName)}</strong> ya están listos para recoger.`
            }</p>
          </td></tr>
          <tr><td style="padding:24px 0" align="center">
            <div style="font-size:13px;color:#5c5c5c;margin-bottom:8px">Tu código de recogida</div>
            <div style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;background:#f5f5f5;border-radius:10px;padding:14px 20px;display:inline-block">${escapeHtml(spacedCode)}</div>
          </td></tr>
          <tr><td style="font-size:15px;line-height:22px">
            <p style="margin:0 0 8px"><strong>Dónde:</strong> ${escapeHtml(input.storeName)}${input.address ? `, ${escapeHtml(input.address)}` : ''}</p>
            <p style="margin:0 0 16px">Presenta este código y una identificación oficial en el mostrador. Si alguien más recoge por ti, compártele el código.</p>
            <p style="margin:0 0 6px"><strong>Productos</strong></p>
            <ul style="margin:0 0 16px;padding-left:20px">${input.items.map((item) => `<li>${escapeHtml(itemLabel(item))}</li>`).join('')}</ul>
            <p style="margin:0;font-size:13px;color:#5c5c5c">No compartas este código con nadie más. La ferretería nunca te lo pedirá por teléfono ni por mensaje.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  return { subject, html, text }
}
