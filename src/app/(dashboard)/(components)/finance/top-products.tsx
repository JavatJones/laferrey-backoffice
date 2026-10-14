'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TopProduct } from '@/lib/finance/queries'
import { formatCurrency, formatNumber } from '@/lib/shopify/format'

const ProductsTable = ({ products }: { products: TopProduct[] }) => (
  <Table>
    <TableHeader>
      <TableRow className='hover:bg-transparent'>
        <TableHead className='w-10'>#</TableHead>
        <TableHead>Producto</TableHead>
        <TableHead className='text-right'>Unidades</TableHead>
        <TableHead className='text-right'>Venta neta</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {products.map((product, index) => (
        <TableRow key={product.productGid ?? product.title}>
          <TableCell className='text-muted-foreground tabular-nums'>{index + 1}</TableCell>
          <TableCell className='max-w-80'>
            <span className='line-clamp-2 whitespace-normal'>{product.title}</span>
          </TableCell>
          <TableCell className='text-right tabular-nums'>{formatNumber(product.units)}</TableCell>
          <TableCell className='text-right font-medium tabular-nums'>{formatCurrency(product.netAmount)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

const LIMIT = 10

// Ranking por venta neta y por unidades. Recibe un ranking más largo por venta para
// que el de unidades no se quede solo con los que más venden en pesos.
export const TopProducts = ({ products }: { products: TopProduct[] }) => {
  if (products.length === 0) {
    return <p className='py-6 text-center text-sm text-muted-foreground'>Sin ventas en este periodo.</p>
  }

  const byNet = products.slice(0, LIMIT)
  const byUnits = [...products].sort((a, b) => b.units - a.units || b.netAmount - a.netAmount).slice(0, LIMIT)

  return (
    <Tabs defaultValue='venta'>
      <TabsList>
        <TabsTrigger value='venta'>Por venta</TabsTrigger>
        <TabsTrigger value='unidades'>Por unidades</TabsTrigger>
      </TabsList>
      <TabsContent value='venta'>
        <ProductsTable products={byNet} />
      </TabsContent>
      <TabsContent value='unidades'>
        <ProductsTable products={byUnits} />
      </TabsContent>
    </Tabs>
  )
}
