import type { Metadata } from 'next'
import Link from 'next/link'
import { PackagePlus, PackageSearch, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { requireStoreAccess } from '@/lib/auth/dal'
import { formatCount } from '@/lib/shopify/format'
import { listStoreProducts } from '@/lib/shopify/products'
import { productListSearchSchema, productStatusFromFilter } from '@/lib/validations/product'
import { ProductFilters } from '../../../(components)/products/product-filters'
import { ProductsTable } from '../../../(components)/products/products-table'
import { CursorPagination } from '../../../(components)/shared/cursor-pagination'
import { PageContainer } from '../../../(components)/shared/page-container'
import { PageHeader } from '../../../(components)/shared/page-header'

export const metadata: Metadata = { title: 'Productos' }

const ProductsPage = async ({ params, searchParams }: PageProps<'/[hardware_store]/productos'>) => {
  const { hardware_store } = await params
  const { store } = await requireStoreAccess(hardware_store)
  const filters = productListSearchSchema.parse(await searchParams)
  const base = `/${store.slug}/productos`

  const { products, pageInfo, count } = await listStoreProducts(store, {
    search: filters.q,
    status: filters.estado ? productStatusFromFilter[filters.estado] : undefined,
    after: filters.despues,
    before: filters.antes,
  })

  const hrefFor = (cursor: { despues: string } | { antes: string }) => {
    const query = new URLSearchParams()
    if (filters.q) query.set('q', filters.q)
    if (filters.estado) query.set('estado', filters.estado)
    for (const [key, value] of Object.entries(cursor)) query.set(key, value)
    return `${base}?${query.toString()}`
  }

  const filtered = Boolean(filters.q || filters.estado)
  const newProductButton = (
    <Button size='lg' nativeButton={false} render={<Link href={`${base}/nuevo`} />}>
      <Plus data-icon='inline-start' />
      Agregar producto
    </Button>
  )

  return (
    <PageContainer>
      <PageHeader
        title='Productos'
        description={`Tu catálogo en la tienda de LaFerrey (proveedor ${store.vendor}).`}
        breadcrumbs={[{ label: 'Resumen', href: `/${store.slug}` }, { label: 'Productos' }]}
        actions={newProductButton}
      />

      <Card className='gap-0 py-0'>
        <CardHeader className='border-b p-4'>
          <ProductFilters filters={filters} />
        </CardHeader>
        <CardContent className='px-0'>
          {products.length > 0 ? (
            <ProductsTable products={products} slug={store.slug} />
          ) : filtered ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <PackageSearch />
                </EmptyMedia>
                <EmptyTitle>Sin resultados</EmptyTitle>
                <EmptyDescription>Ningún producto coincide con la búsqueda o el filtro.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant='icon'>
                  <PackagePlus />
                </EmptyMedia>
                <EmptyTitle>Aún no tienes productos</EmptyTitle>
                <EmptyDescription>Agrega tu primer producto; se crea en Borrador hasta que decidas activarlo.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>{newProductButton}</EmptyContent>
            </Empty>
          )}
        </CardContent>
        <div className='border-t p-4'>
          <CursorPagination pageInfo={pageInfo} hrefFor={hrefFor} summary={`${formatCount(count)} productos`} />
        </div>
      </Card>
    </PageContainer>
  )
}

export default ProductsPage
