'use client'

import { useTransition } from 'react'
import { Archive, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { deleteProduct, setProductStatus } from '@/app/(dashboard)/[hardware_store]/productos/actions'

type Props = {
  slug: string
  productId: string
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
  canArchive: boolean
}

// P-05: se puede eliminar, con confirmación, pero el panel recomienda archivar.
export const DeleteProductDialog = ({ slug, productId, title, open, onOpenChange, onDeleted, canArchive }: Props) => {
  const [isPending, startTransition] = useTransition()

  const archive = () =>
    startTransition(async () => {
      const result = await setProductStatus(slug, productId, 'ARCHIVED')
      if (!result.ok) return void toast.add({ type: 'error', title: 'No se pudo archivar', description: result.error })
      toast.add({ type: 'success', title: 'Producto archivado', description: 'Ya no se ve en la tienda, pero se conserva.' })
      onOpenChange(false)
    })

  const remove = () =>
    startTransition(async () => {
      const result = await deleteProduct(slug, productId)
      if (!result.ok) return void toast.add({ type: 'error', title: 'No se pudo eliminar', description: result.error })
      toast.add({ type: 'success', title: 'Producto eliminado' })
      onOpenChange(false)
      onDeleted?.()
    })

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent className='data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Se borra de Shopify y no se puede deshacer.
            {canArchive && ' Te recomendamos archivarlo: deja de verse en la tienda, pero se conserva con su historial.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          {canArchive && (
            <Button variant='outline' onClick={archive} disabled={isPending}>
              <Archive data-icon='inline-start' aria-hidden />
              Archivar en su lugar
            </Button>
          )}
          <Button variant='destructive' onClick={remove} disabled={isPending}>
            {isPending ? <Spinner data-icon='inline-start' /> : <Trash2 data-icon='inline-start' aria-hidden />}
            Eliminar definitivamente
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
