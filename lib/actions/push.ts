'use server'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { pushSubscriptionSchema } from '@/lib/actions/push.schema'

export async function savePushSubscription(sessionId: string, sub: unknown) {
  if (!z.string().uuid().safeParse(sessionId).success) return { error: 'Invalid session' }

  const parsed = pushSubscriptionSchema.safeParse(sub)
  if (!parsed.success) return { error: 'Invalid subscription' }

  const { endpoint, keys } = parsed.data
  await db
    .insert(pushSubscriptions)
    .values({ sessionId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { sessionId, p256dh: keys.p256dh, auth: keys.auth },
    })

  return { error: null }
}

export async function removePushSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  return { error: null }
}
