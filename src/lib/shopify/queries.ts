import 'server-only'
import { shopifyAdminQuery } from './client'

export type Money = { amount: string; currencyCode: string }

export type PageInfo = {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor: string | null
  endCursor: string | null
}

export type Connection<T> = { nodes: T[]; pageInfo: PageInfo }

type Count = { count: number; precision: 'EXACT' | 'AT_LEAST' }

export type PageArgs = { after?: string; before?: string }

export type StoreSummary = {
  shop: { name: string; myshopifyDomain: string; ianaTimezone: string }
  ordersCount: Count
  unfulfilledOrdersCount: Count
  productsCount: Count
}

export type Order = {
  id: string
  legacyResourceId: string
  name: string
  createdAt: string
  cancelledAt: string | null
  test: boolean
  displayFinancialStatus: string | null
  displayFulfillmentStatus: string
  currentSubtotalLineItemsQuantity: number
  currentTotalPriceSet: { shopMoney: Money }
  customer: { displayName: string } | null
}

export type Product = {
  id: string
  legacyResourceId: string
  title: string
  status: string
  vendor: string
  productType: string
  totalInventory: number | null
  tracksInventory: boolean
  featuredMedia: { preview: { image: { url: string; altText: string | null } | null } | null } | null
  priceRangeV2: { minVariantPrice: Money; maxVariantPrice: Money }
  variantsCount: { count: number } | null
}

const ORDERS_PAGE_SIZE = 20
const PRODUCTS_PAGE_SIZE = 24

// Shopify pagina con cursores: "after" avanza con first, "before" retrocede con last.
const toPaginationVariables = ({ after, before }: PageArgs, pageSize: number) =>
  before ? { last: pageSize, before } : { first: pageSize, after }

const PAGE_INFO_FIELDS = /* GraphQL */ `
  pageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
`

const STORE_SUMMARY_QUERY = /* GraphQL */ `
  query StoreSummary {
    shop {
      name
      myshopifyDomain
      ianaTimezone
    }
    ordersCount {
      count
      precision
    }
    unfulfilledOrdersCount: ordersCount(query: "status:open fulfillment_status:unfulfilled") {
      count
      precision
    }
    productsCount {
      count
      precision
    }
  }
`

const ORDERS_QUERY = /* GraphQL */ `
  query RecentOrders($first: Int, $last: Int, $after: String, $before: String) {
    orders(
      first: $first
      last: $last
      after: $after
      before: $before
      sortKey: CREATED_AT
      reverse: true
    ) {
      nodes {
        id
        legacyResourceId
        name
        createdAt
        cancelledAt
        test
        displayFinancialStatus
        displayFulfillmentStatus
        currentSubtotalLineItemsQuantity
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          displayName
        }
      }
      ${PAGE_INFO_FIELDS}
    }
  }
`

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int, $last: Int, $after: String, $before: String, $query: String) {
    products(
      first: $first
      last: $last
      after: $after
      before: $before
      query: $query
      sortKey: TITLE
    ) {
      nodes {
        id
        legacyResourceId
        title
        status
        vendor
        productType
        totalInventory
        tracksInventory
        featuredMedia {
          preview {
            image {
              url
              altText
            }
          }
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
          maxVariantPrice {
            amount
            currencyCode
          }
        }
        variantsCount {
          count
        }
      }
      ${PAGE_INFO_FIELDS}
    }
  }
`

export const getStoreSummary = () => shopifyAdminQuery<StoreSummary>(STORE_SUMMARY_QUERY)

export const getOrders = async (page: PageArgs) => {
  const { orders } = await shopifyAdminQuery<{ orders: Connection<Order> }>(
    ORDERS_QUERY,
    toPaginationVariables(page, ORDERS_PAGE_SIZE)
  )
  return orders
}

export const getProducts = async (page: PageArgs & { search?: string }) => {
  const { products } = await shopifyAdminQuery<{ products: Connection<Product> }>(PRODUCTS_QUERY, {
    ...toPaginationVariables(page, PRODUCTS_PAGE_SIZE),
    query: page.search || null,
  })
  return products
}
