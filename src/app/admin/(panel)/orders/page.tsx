import type { Metadata } from 'next'

import { getAllOrders } from '@/features/admin/orders/services/order-queries'
import { PageHeader } from '@/shared/components/PageHeader'
import { OrdersList } from '@/features/admin/orders'
import { OrdersRealtime } from '@/features/admin/orders'

export const metadata: Metadata = { title: 'Orders — Zita Boutique' }

// New orders must surface immediately; never serve a build snapshot.
export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const orders = await getAllOrders()

  return (
    <>
      <OrdersRealtime />
      <PageHeader title="Orders" description="Customer orders to confirm and fulfil." />
      <OrdersList orders={orders} />
    </>
  )
}
