// Sintaxis de búsqueda de Shopify: los valores van entre comillas, con `\` y `"`
// escapados, para que un término como `x OR vendor:Otro` no altere el filtro.
export const quoteSearchValue = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

export type ProductStatusFilter = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'UNLISTED'

export const buildVendorProductQuery = (
  vendor: string,
  { search, status }: { search?: string | null; status?: ProductStatusFilter | null } = {}
) => {
  const terms = [`vendor:${quoteSearchValue(vendor)}`]
  if (status) terms.push(`status:${status.toLowerCase()}`)
  const term = search?.trim()
  if (term) terms.push(quoteSearchValue(term))
  return terms.join(' ')
}
