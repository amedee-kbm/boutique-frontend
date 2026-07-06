import { z } from 'zod'

// Shape of the browser's PushSubscription.toJSON() (the parts we persist).
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
})

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>
