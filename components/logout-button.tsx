'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <Button variant="ghost" onClick={logout} className={cn('w-full justify-start', className)}>
      <LogOut className="size-4 shrink-0" />
      <span>Sign out</span>
    </Button>
  )
}
