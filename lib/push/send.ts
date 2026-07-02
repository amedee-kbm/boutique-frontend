import 'server-only'

import webpush from 'web-push'
import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'
import { env } from '@/lib/env'

webpush.setVapidDetails(env.VAPID_SUBJECT, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY)

// Notify a guest's subscribed devices that the seller replied. Best-effort:
// gone endpoints (404/410) are pruned; other failures are swallowed so a push
// problem never blocks the chat reply.
export async function sendChatPush(sessionId: string, content: string) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.sessionId, sessionId))

  if (subs.length === 0) return

  const payload = JSON.stringify({
    title: 'Zita Boutique',
    body: content.length > 120 ? `${content.slice(0, 117)}…` : content,
    url: '/chat',
  })

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint))
        }
      }
    })
  )
}
