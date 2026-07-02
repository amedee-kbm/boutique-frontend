'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { AuthService } from '../services/auth.service'

interface LogoutButtonProps {
  className?: string
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    const result = await AuthService.signOut()
    if (result.error) {
      toast.error(result.error)
      setIsLoading(false)
      return
    }
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={isLoading}
      className={cn('w-full justify-start', className)}
    >
      <LogOut className="size-4 shrink-0" />
      <span>{isLoading ? 'Signing out…' : 'Sign out'}</span>
    </Button>
  )
}
