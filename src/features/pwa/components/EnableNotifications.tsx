'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

import { useGuestReady, useGuestSession } from '@/features/storefront/chat'
import { savePushSubscription } from '@/features/pwa'
import { Button } from '@/shared/ui'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function EnableNotifications() {
  const ready = useGuestReady()
  const sessionId = useGuestSession()?.sessionId ?? null
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  // Detect push capabilities and any existing subscription once, off the render
  // path. `subscribed` seeds the dismissed state so an already-opted-in guest
  // never sees the prompt.
  const { data: caps } = useQuery({
    queryKey: ['push-capabilities'],
    queryFn: async () => {
      const supported =
        'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches

      let subscribed = false
      if (supported) {
        try {
          const reg = await navigator.serviceWorker.getRegistration()
          if (reg) subscribed = !!(await reg.pushManager.getSubscription())
        } catch {
          // no registration yet — leave the opt-in visible
        }
      }
      return { supported, isIOS, isStandalone, subscribed }
    },
  })

  const isDone = done || !!caps?.subscribed

  async function subscribe() {
    if (!sessionId) return
    setBusy(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notifications were not allowed.')
        return
      }
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
        ),
      })
      const { error } = await savePushSubscription(sessionId, sub.toJSON())
      if (error) {
        toast.error('Could not turn on notifications.')
        return
      }
      setDone(true)
      toast.success("You'll be notified when the seller replies.")
    } catch {
      toast.error('Could not turn on notifications.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready || !sessionId || !caps || !caps.supported || isDone) return null
  if (Notification.permission === 'denied') return null

  // On iOS, web push only works once the site is installed to the home screen.
  if (caps.isIOS && !caps.isStandalone) {
    return (
      <p className="text-muted-foreground border-b px-4 py-2 text-center text-xs">
        Tap Share → “Add to Home Screen” to get notified when the seller replies.
      </p>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
      <span className="text-muted-foreground text-xs">Get notified when the seller replies</span>
      <Button
        size="sm"
        variant="outline"
        onClick={subscribe}
        disabled={busy}
        className="rounded-none"
      >
        <Bell className="size-3.5" />
        Turn on
      </Button>
    </div>
  )
}
