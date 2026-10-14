import { describe, expect, it } from 'vitest'
import { sanitizeDescription } from './sanitize'

describe('sanitizeDescription', () => {
  it('conserva el formato permitido', () => {
    expect(sanitizeDescription('<h2>Uso</h2><p>Para <strong>tornillos</strong> y <em>clavos</em></p><ul><li>Acero</li></ul>')).toBe(
      '<h2>Uso</h2><p>Para <strong>tornillos</strong> y <em>clavos</em></p><ul><li>Acero</li></ul>'
    )
  })

  it('quita scripts, eventos y estilos', () => {
    expect(sanitizeDescription('<p onclick="x()">Hola</p><script>alert(1)</script><img src=x onerror=alert(1)>')).toBe(
      '<p>Hola</p>'
    )
    expect(sanitizeDescription('<p style="color:red">Rojo</p><iframe src="https://evil"></iframe>')).toBe('<p>Rojo</p>')
  })

  it('solo permite enlaces http, https y mailto, con rel seguro', () => {
    expect(sanitizeDescription('<a href="javascript:alert(1)">x</a>')).toBe('<a rel="noopener noreferrer">x</a>')
    expect(sanitizeDescription('<a href="https://laferrey.mx" target="_blank">LaFerrey</a>')).toBe(
      '<a href="https://laferrey.mx" rel="noopener noreferrer">LaFerrey</a>'
    )
  })

  it('normaliza etiquetas equivalentes y quita párrafos vacíos', () => {
    expect(sanitizeDescription('<b>a</b><i>b</i><div>c</div><p> </p>')).toBe('<strong>a</strong><em>b</em><p>c</p>')
  })
})
