// Crea (o completa) la ferretería Mercado Total Ferretero y su cuenta inicial.
// Idempotente. Uso: pnpm seed:admin [--reset-password]
//
// La contraseña temporal se imprime una sola vez y nunca se escribe en disco (RN-06).
import { generateTemporaryPassword } from '@/lib/auth/temporary-password'
import { createAdminClient } from '@/lib/supabase/admin'

const STORE = {
  slug: 'mercado-total-ferretero',
  name: 'Mercado Total Ferretero',
  shopify_vendor: 'Mercado Total Ferretero',
  shopify_location_id: 'gid://shopify/Location/85431091293',
}

const ADMIN_EMAIL = 'admin@mercadototal.com'

const admin = createAdminClient()

const findUserByEmail = async (email: string) => {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email)
    if (user || data.users.length < 200) return user ?? null
  }
}

const requireTemporaryPasswordChange = async (userId: string) => {
  const { error } = await admin.from('profiles').update({ must_change_password: true }).eq('id', userId)
  if (error) throw error
}

const printPassword = (password: string) => {
  console.log('\n────────────────────────────────────────────')
  console.log(`  Cuenta:                ${ADMIN_EMAIL}`)
  console.log(`  Contraseña temporal:   ${password}`)
  console.log('────────────────────────────────────────────')
  console.log('Compártela por un canal seguro. Se muestra solo esta vez;')
  console.log('al entrar, el panel obliga a cambiarla.\n')
}

const main = async () => {
  const resetPassword = process.argv.includes('--reset-password')

  const { data: store, error: storeError } = await admin
    .from('hardware_stores')
    .upsert(STORE, { onConflict: 'slug' })
    .select('id, slug')
    .single()
  if (storeError) throw storeError
  console.log(`Ferretería lista: ${STORE.name} (/${store.slug})`)

  let user = await findUserByEmail(ADMIN_EMAIL)
  let password: string | null = null

  if (!user) {
    password = generateTemporaryPassword()
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Administrador Mercado Total' },
    })
    if (error) throw error
    user = data.user
    await requireTemporaryPasswordChange(user.id)
    console.log(`Cuenta creada: ${ADMIN_EMAIL}`)
  } else if (resetPassword) {
    password = generateTemporaryPassword()
    const { error } = await admin.auth.admin.updateUserById(user.id, { password })
    if (error) throw error
    await requireTemporaryPasswordChange(user.id)
    console.log(`Contraseña restablecida: ${ADMIN_EMAIL}`)
  } else {
    console.log(`La cuenta ${ADMIN_EMAIL} ya existe; su contraseña no cambió (usa --reset-password).`)
  }

  const { error: memberError } = await admin
    .from('hardware_store_members')
    .upsert(
      { user_id: user.id, hardware_store_id: store.id, role: 'owner' },
      { onConflict: 'user_id,hardware_store_id', ignoreDuplicates: true }
    )
  if (memberError) throw memberError
  console.log('Membresía lista: owner')

  if (password) printPassword(password)
}

main().catch((error) => {
  console.error('No se pudo preparar la cuenta inicial:', error instanceof Error ? error.message : error)
  process.exit(1)
})
