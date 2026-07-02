import { redirect } from 'next/navigation'

import { getAdminUser } from '@/features/auth/services/admin-guard'
import { AdminSidebar } from '@/widgets/admin-nav'
import { AdminMobileNav } from '@/widgets/admin-nav'

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAdminUser()

  if (!user) redirect('/admin/login')

  // Customers are also non-anonymous users now, so authentication alone is not
  // enough — only seller accounts seeded in public.admins may enter. Send
  // everyone else to the storefront (not /admin/login, which would loop).
  if (!isAdmin) redirect('/')

  return (
    <div className="bg-muted/40 min-h-svh">
      <AdminSidebar userEmail={user.email ?? 'Admin'} />
      <main className="pb-20 md:pb-0 md:pl-60">
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </main>
      <AdminMobileNav />
    </div>
  )
}
