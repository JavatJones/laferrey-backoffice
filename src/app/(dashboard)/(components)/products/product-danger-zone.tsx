'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import type { ProductStatus } from '@/lib/validations/product'
import { setProductStatus } from '@/app/(dashboard)/[hardware_store]/productos/actions'
import { DeleteProductDialog } from './delete-product-dialog'

type Props = { slug: string; productId: string; title: string; status: ProductStatus }

export const ProductDangerZone = ({ slug, productId, title, status }: Props) => {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const archived = status === 'ARCHIVED'

  const toggleArchive = () =>
    startTransition(async () => {
      const result = await setProductStatus(slug, productId, archived ? 'DRAFT' : 'ARCHIVED')
      if (!result.ok) return void toast.add({ type: 'error', title: 'No se pudo cambiar el estado', description: result.error })
      toast.add({ type: 'success', title: archived ? 'Restaurado como borrador' : 'Producto archivado' })
      router.refresh()
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Archivar o eliminar</CardTitle>
        <CardDescription>
          Archivar lo oculta de la tienda y lo conserva. Eliminar lo borra de Shopify y no se puede deshacer.
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-wrap gap-2'>
        <Button variant='outline' size='lg' onClick={toggleArchive} disabled={isPending}>
          {isPending ? (
            <Spinner data-icon='inline-start' />
          ) : archived ? (
            <ArchiveRestore data-icon='inline-start' />
          ) : (
            <Archive data-icon='inline-start' />
          )}
          {archived ? 'Restaurar como borrador' : 'Archivar'}
        </Button>
        <Button variant='destructive' size='lg' onClick={() => setDeleteOpen(true)} disabled={isPending}>
          <Trash2 data-icon='inline-start' />
          Eliminar
        </Button>
      </CardContent>
      <DeleteProductDialog
        slug={slug}
        productId={productId}
        title={title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        canArchive={!archived}
        onDeleted={() => router.push(`/${slug}/productos`)}
      />
    </Card>
  )
}
