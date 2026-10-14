import { Fragment } from 'react'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export type Crumb = { label: string; href?: string }

type Props = {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
}

export const PageHeader = ({ title, description, breadcrumbs, actions }: Props) => {
  return (
    <header className='flex flex-col gap-3'>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div className='flex min-w-0 flex-col gap-1'>
          <h1 className='text-2xl font-bold tracking-tight text-balance'>{title}</h1>
          {description && <p className='text-sm text-muted-foreground'>{description}</p>}
        </div>
        {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
      </div>
    </header>
  )
}
