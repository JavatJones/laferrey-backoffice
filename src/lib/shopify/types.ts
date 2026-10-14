export type Money = { amount: string; currencyCode: string }

export type PageInfo = {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export type Connection<T> = { nodes: T[]; pageInfo: PageInfo }

export type Count = { count: number; precision: 'EXACT' | 'AT_LEAST' }

export type UserError = { field: string[] | null; message: string; code?: string | null }
