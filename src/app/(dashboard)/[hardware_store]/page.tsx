import React from 'react'
import Form from 'next/form'
import Link from 'next/link'
import { Package, Search, ShoppingBag, Truck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getMissingShopifyEnv } from '@/lib/shopify/client'
import { formatCount } from '@/lib/shopify/format'
import { getOrders, getProducts, getStoreSummary } from '@/lib/shopify/queries'
import { cn } from '@/lib/utils'
import { OrdersTable } from '../(components)/shopify/orders-table'
import { Pagination } from '../(components)/shopify/pagination'
import { ProductsGrid } from '../(components)/shopify/products-grid'
import { ShopifySetupNotice } from '../(components)/shopify/setup-notice'
import { StatCard } from '../(components)/shopify/stat-card'

type Tab = 'ordenes' | 'productos'

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

const HardwareStorePage = async ({ params, searchParams }: PageProps<'/[hardware_store]'>) => {
  const { hardware_store } = await params
  const query = await searchParams

  const tab: Tab = firstParam(query.tab) === 'productos' ? 'productos' : 'ordenes'
  const page = { after: firstParam(query.after), before: firstParam(query.before) }
  const search = firstParam(query.q)?.trim() || undefined

  const missingEnv = getMissingShopifyEnv()
  if (missingEnv.length > 0) {
    return (
      <div className='px-6 py-10'>
        <ShopifySetupNotice missing={missingEnv} />
      </div>
    )
  }

  const [summary, orders, products] = await Promise.all([
    getStoreSummary(),
    tab === 'ordenes' ? getOrders(page) : null,
    tab === 'productos' ? getProducts({ ...page, search }) : null,
  ])

  const basePath = `/${hardware_store}`
  const buildHref = (values: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(values)) {
      if (value) searchParams.set(key, value)
    }
    const queryString = searchParams.toString()
    return queryString ? `${basePath}?${queryString}` : basePath
  }

  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: 'ordenes', label: 'Órdenes recientes', href: buildHref({}) },
    { id: 'productos', label: 'Productos', href: buildHref({ tab: 'productos' }) },
  ]

  return (
    <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-bold tracking-tight'>{summary.shop.name}</h1>
        <p className='text-sm text-muted-foreground'>{summary.shop.myshopifyDomain}</p>
      </header>

      <section className='grid gap-4 sm:grid-cols-3'>
        <StatCard label='Órdenes' value={formatCount(summary.ordersCount)} icon={ShoppingBag} />
        <StatCard label='Por preparar' value={formatCount(summary.unfulfilledOrdersCount)} icon={Truck} />
        <StatCard label='Productos' value={formatCount(summary.productsCount)} icon={Package} />
      </section>

      <Card className='gap-0 py-0'>
        <div className='flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between'>
          <nav className='flex w-fit gap-1 rounded-lg bg-muted p-1'>
            {tabs.map(({ id, label, href }) => (
              <Link
                key={id}
                href={href}
                aria-current={tab === id ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  tab === id && 'bg-white text-foreground shadow-sm'
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {tab === 'productos' && (
            <Form action={basePath} className='relative w-full sm:max-w-xs'>
              <input type='hidden' name='tab' value='productos' />
              <Search size={16} className='pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground' />
              <Input name='q' type='search' defaultValue={search} placeholder='Buscar productos…' className='h-9 pl-8' />
            </Form>
          )}
        </div>

        {orders && (
          <>
            <OrdersTable orders={orders.nodes} hardwareStore={hardware_store} timeZone={summary.shop.ianaTimezone} />
            <Pagination className='border-t p-4' pageInfo={orders.pageInfo} hrefFor={buildHref} />
          </>
        )}

        {products && (
          <>
            <div className='p-4'>
              <ProductsGrid
                products={products.nodes}
                storeHandle={summary.shop.myshopifyDomain.replace('.myshopify.com', '')}
                search={search}
              />
            </div>
            <Pagination
              className='border-t p-4'
              pageInfo={products.pageInfo}
              hrefFor={(cursor) => buildHref({ tab: 'productos', q: search, ...cursor })}
            />
          </>
        )}
      </Card>
    </div>
  )
}

export default HardwareStorePage
