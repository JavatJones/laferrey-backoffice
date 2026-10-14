import type { Metadata } from 'next'
import { requireStoreAccess } from '@/lib/auth/dal'
import { emptyProduct } from '@/lib/validations/product'
import { ProductForm } from '../../../(components)/products/product-form'
import { PageContainer } from '../../../(components)/shared/page-container'
import { PageHeader } from '../../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Nuevo producto' }

const NewProductPage = async ({ params }: PageProps<'/[hardware_store]/productos/nuevo'>) => {
  const { hardware_store } = await params
  const { store } = await requireStoreAccess(hardware_store)

  return (
    <PageContainer>
      <PageHeader
        title='Nuevo producto'
        description={`Se crea con tu proveedor (${store.vendor}) y en Borrador, salvo que elijas Activo.`}
        breadcrumbs={[
          { label: 'Resumen', href: `/${store.slug}` },
          { label: 'Productos', href: `/${store.slug}/productos` },
          { label: 'Nuevo' },
        ]}
      />
      <ProductForm slug={store.slug} mode='create' defaultValues={emptyProduct()} locationLabel={store.name} />
    </PageContainer>
  )
}

export default NewProductPage
