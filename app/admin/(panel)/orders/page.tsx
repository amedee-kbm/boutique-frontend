import type { Metadata } from 'next'

import { getAllOrders } from '@/lib/db/queries'
import { PageHeader } from '@/components/admin/PageHeader'
import { OrdersList } from '@/components/admin/OrdersList'
import { OrdersRealtime } from '@/components/admin/OrdersRealtime'

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
