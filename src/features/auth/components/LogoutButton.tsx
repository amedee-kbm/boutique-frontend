'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { AuthService } from '../services/auth.service'

export function LogoutButton() {
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
      className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
    >
      {isLoading ? 'Logging out…' : 'Log out'}
    </Button>
  )
}
