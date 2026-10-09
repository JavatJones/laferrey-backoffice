'use client'

import React from 'react'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const HardwareStoreError = ({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) => {
  return (
    <div className='px-6 py-10'>
      <Card className='mx-auto max-w-2xl'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg'>
            <TriangleAlert size={20} /> No se pudo cargar la información de Shopify
          </CardTitle>
          <CardDescription className='break-words'>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant='outline' size='lg' onClick={() => retry()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default HardwareStoreError
