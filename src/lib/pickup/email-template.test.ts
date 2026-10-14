import { describe, expect, it } from 'vitest'
import { buildPickupEmail } from './email-template'

const base = {
  customerName: 'Ana López',
  orderName: '#1001',
  storeName: 'Mercado Total Ferretero',
  code: '048213',
  address: 'Av. Constitución 100, Monterrey',
  items: [{ title: 'Martillo 16 oz', variantTitle: null, quantity: 2 }],
}

describe('buildPickupEmail', () => {
  it('incluye el código, la sucursal y los productos', () => {
    const email = buildPickupEmail(base)
    expect(email.subject).toBe('Tu pedido #1001 está listo para recoger')
    expect(email.text).toContain('Tu código de recogida: 048 213')
    expect(email.html).toContain('048 213')
    expect(email.text).toContain('2 × Martillo 16 oz')
    expect(email.text).toContain('Av. Constitución 100, Monterrey')
  })

  it('escapa los datos que vienen de Shopify', () => {
    const email = buildPickupEmail({
      ...base,
      customerName: '<script>alert(1)</script>',
      items: [{ title: '<img src=x onerror=alert(1)>', variantTitle: '"rojo"', quantity: 1 }],
    })
    expect(email.html).not.toContain('<script>')
    expect(email.html).not.toContain('<img')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('el reenvío avisa que el código anterior ya no sirve', () => {
    const email = buildPickupEmail({ ...base, resent: true })
    expect(email.subject).toBe('Nuevo código para recoger tu pedido #1001')
    expect(email.text).toContain('El código anterior ya no sirve')
  })
})
