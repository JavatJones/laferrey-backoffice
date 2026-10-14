import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireStoreAccess } from '@/lib/auth/dal'
import { formatDateTime } from '@/lib/shopify/format'
import { getStoreProduct } from '@/lib/shopify/products'
import { productIdSchema } from '@/lib/validations/product'
import { ProductDangerZone } from '../../../(components)/products/product-danger-zone'
import { ProductForm } from '../../../(components)/products/product-form'
import { ProductStatusBadge } from '../../../(components)/products/product-status-badge'
import { PageContainer } from '../../../(components)/shared/page-container'
import { PageHeader } from '../../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Producto' }

const ProductPage = async ({ params }: PageProps<'/[hardware_store]/productos/[product_id]'>) => {
  const { hardware_store, product_id } = await params
  const { store } = await requireStoreAccess(hardware_store)
  if (!productIdSchema.safeParse(product_id).success) notFound()

  // Un producto de otro proveedor responde igual que uno inexistente (RN-08).
  const product = await getStoreProduct(store, product_id)
  if (!product) notFound()

  return (
    <PageContainer>
      <PageHeader
        title={
          <span className='flex flex-wrap items-center gap-2'>
            {product.title}
            <ProductStatusBadge status={product.status} />
          </span>
        }
        description={`Actualizado: ${formatDateTime(product.updatedAt)}`}
        breadcrumbs={[
          { label: 'Resumen', href: `/${store.slug}` },
          { label: 'Productos', href: `/${store.slug}/productos` },
          { label: product.title },
        ]}
        actions={
          product.onlineStoreUrl && product.status === 'ACTIVE' ? (
            <Button
              variant='outline'
              size='lg'
              nativeButton={false}
              render={<a href={product.onlineStoreUrl} target='_blank' rel='noreferrer' />}
            >
              <ExternalLink data-icon='inline-start' />
              Ver en la tienda
            </Button>
          ) : undefined
        }
      />
      <ProductForm
        // Se vuelve a montar con los datos frescos después de guardar.
        key={product.updatedAt}
        slug={store.slug}
        mode='edit'
        productId={product.id}
        defaultValues={product.values}
        locationLabel={store.name}
        variantsEditable={product.variantsEditable}
        mediaEditable={product.mediaEditable}
      />
      <ProductDangerZone slug={store.slug} productId={product.id} title={product.title} status={product.status} />
    </PageContainer>
  )
}

export default ProductPage
