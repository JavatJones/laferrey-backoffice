import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'LaFerrey',
    template: '%s · LaFerrey',
  },
  description: 'Panel de ferreterías de LaFerrey',
}

const RootLayout = ({ children }: LayoutProps<'/'>) => {
  return (
    <html lang='es' className={cn(geistSans.variable, geistMono.variable, 'h-full antialiased')}>
      <body className='flex min-h-full flex-col'>
        <TooltipProvider>
          <Toaster>{children}</Toaster>
        </TooltipProvider>
      </body>
    </html>
  )
}

export default RootLayout
