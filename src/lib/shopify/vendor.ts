// RN-01/RN-02: el proveedor se compara completo, ignorando solo mayúsculas y espacios
// sobrantes. Debe coincidir con la columna generada hardware_stores.shopify_vendor_key:
//   lower(btrim(regexp_replace(shopify_vendor, '[ \t\n\r\f\v]+', ' ', 'g')))
const WHITESPACE = /[ \t\n\r\f\v]+/g

export const normalizeVendor = (vendor: string | null | undefined) =>
  (vendor ?? '').replace(WHITESPACE, ' ').trim().toLowerCase()

export const isSameVendor = (a: string | null | undefined, b: string | null | undefined) => {
  const key = normalizeVendor(a)
  return key !== '' && key === normalizeVendor(b)
}
