import sanitizeHtml from 'sanitize-html'

// La tienda muestra la descripción tal cual: se sanea en el servidor con lista blanca
// para evitar XSS. También se sanea antes de cargarla en el editor del panel.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'a'],
  // rel lo pone transformTags; cualquier otro atributo se descarta.
  allowedAttributes: { a: ['href', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: {
    b: 'strong',
    i: 'em',
    h1: 'h2',
    div: 'p',
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

export const sanitizeDescription = (html: string) =>
  sanitizeHtml(html, OPTIONS)
    .replace(/<p>\s*<\/p>/g, '')
    .trim()
