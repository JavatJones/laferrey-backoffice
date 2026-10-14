'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Archive, ArchiveRestore, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/toast'
import type { ProductStatus } from '@/lib/validations/product'
import { setProductStatus } from '@/app/(dashboard)/[hardware_store]/productos/actions'
import { DeleteProductDialog } from './delete-product-dialog'

type Props = { slug: string; productId: string; title: string; status: ProductStatus }

export const ProductActionsMenu = ({ slug, productId, title, status }: Props) => {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const archived = status === 'ARCHIVED'

  const toggleArchive = () =>
    startTransition(async () => {
      // Al restaurar queda en Borrador para revisarlo antes de volver a publicarlo.
      const result = await setProductStatus(slug, productId, archived ? 'DRAFT' : 'ARCHIVED')
      if (!result.ok) return void toast.add({ type: 'error', title: 'No se pudo cambiar el estado', description: result.error })
      toast.add({ type: 'success', title: archived ? 'Restaurado como borrador' : 'Producto archivado' })
    })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant='ghost' size='icon' aria-label={`Acciones de ${title}`} disabled={isPending} />}
        >
          <EllipsisVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='min-w-44'>
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href={`/${slug}/productos/${productId}`} />}>
              <Pencil aria-hidden />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleArchive}>
              {archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {archived ? 'Restaurar' : 'Archivar'}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant='destructive' onClick={() => setDeleteOpen(true)}>
              <Trash2 aria-hidden />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteProductDialog
        slug={slug}
        productId={productId}
        title={title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        canArchive={!archived}
      />
    </>
  )
}
