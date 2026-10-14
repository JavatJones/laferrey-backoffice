// Activa "Recoger en tienda" en la sucursal de una ferretería (requisito de la Fase 5b).
//   pnpm shopify:enable-pickup --slug mercado-total-ferretero [--yes]
// Cambia el checkout de la tienda real: los clientes verán la opción de pickup.
import { shopifyAdminQuery } from '@/lib/shopify/client'
import type { UserError } from '@/lib/shopify/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { confirm, flagValue, run } from '../lib/cli'

const LOCATION_QUERY = /* GraphQL */ `
  query PickupLocation($id: ID!) {
    location(id: $id) {
      id
      name
      localPickupSettingsV2 { pickupTime instructions }
    }
  }
`

const ENABLE_MUTATION = /* GraphQL */ `
  mutation EnablePickup($settings: DeliveryLocationLocalPickupEnableInput!) {
    locationLocalPickupEnable(localPickupSettings: $settings) {
      localPickupSettings { pickupTime instructions }
      userErrors { field message }
    }
  }
`

const INSTRUCTIONS =
  'Te avisaremos por correo cuando tu pedido esté listo. Presenta tu número de orden en el mostrador.'

run(async () => {
  const slug = flagValue('slug') ?? 'mercado-total-ferretero'
  const admin = createAdminClient()
  const { data: store, error } = await admin
    .from('hardware_stores')
    .select('name, shopify_location_id')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!store?.shopify_location_id) throw new Error(`La ferretería ${slug} no existe o no tiene sucursal`)

  const { location } = await shopifyAdminQuery<{
    location: { id: string; name: string; localPickupSettingsV2: { pickupTime: string; instructions: string } | null } | null
  }>(LOCATION_QUERY, { id: store.shopify_location_id })
  if (!location) throw new Error('La sucursal no existe en Shopify')

  if (location.localPickupSettingsV2) {
    console.log(`El pickup ya está activo en "${location.name}" (${location.localPickupSettingsV2.pickupTime}).`)
    return
  }

  if (!(await confirm(`¿Activar "Recoger en tienda" en "${location.name}"? Los clientes lo verán en el checkout.`))) return

  const { locationLocalPickupEnable } = await shopifyAdminQuery<{
    locationLocalPickupEnable: { localPickupSettings: { pickupTime: string } | null; userErrors: UserError[] }
  }>(ENABLE_MUTATION, {
    settings: { locationId: location.id, pickupTime: 'TWENTY_FOUR_HOURS', instructions: INSTRUCTIONS },
  })
  if (locationLocalPickupEnable.userErrors.length > 0) {
    throw new Error(locationLocalPickupEnable.userErrors.map((e) => e.message).join('; '))
  }
  console.log(`✔ Pickup activo en "${location.name}" (${locationLocalPickupEnable.localPickupSettings?.pickupTime}).`)
})
