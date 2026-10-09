import React from 'react'

const OrderByIdPage = async ({ params }: { params: Promise<{ order_id: string }> }) => {
  const { order_id } = await params;

  return (
    <div>
      {order_id}
    </div>
  )
}

export default OrderByIdPage
