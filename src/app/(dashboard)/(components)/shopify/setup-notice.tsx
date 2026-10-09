import { PlugZap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const ENV_HINTS: Record<string, string> = {
  SHOPIFY_STORE_DOMAIN: 'mi-tienda.myshopify.com',
  SHOPIFY_API_KEY: 'Client ID de la app en dev.shopify.com',
  SHOPIFY_API_SECRET: 'Client secret de la app en dev.shopify.com',
}

export const ShopifySetupNotice = ({ missing }: { missing: string[] }) => {
  return (
    <Card className='mx-auto max-w-2xl'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-lg'>
          <PlugZap size={20} /> Conecta tu tienda de Shopify
        </CardTitle>
        <CardDescription>
          Agrega estas variables a tu archivo <code>.env</code> y reinicia el servidor de desarrollo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className='overflow-x-auto rounded-lg bg-neutral-100 p-4 text-xs leading-relaxed'>
          {missing.map((name) => `${name}=   # ${ENV_HINTS[name] ?? ''}`).join('\n')}
        </pre>
      </CardContent>
    </Card>
  )
}
