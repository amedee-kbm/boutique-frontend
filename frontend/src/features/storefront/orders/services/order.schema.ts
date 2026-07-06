import { z } from 'zod'

// Rwandan mobile, local format: 10 digits, 07 then 2/3/8/9 then 7 more digits.
const RWANDA_MOBILE = /^07[2389]\d{7}$/

// The phone is the seller's only contact channel, so it must be a reachable
// Rwandan mobile. Normalize first — strip spaces/dashes and fold a +250 / 250
// country prefix down to the local 0… form — then check the local pattern.
const rwandaMobile = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(\+?250)/, '0'))
  .refine((value) => RWANDA_MOBILE.test(value), {
    message: 'Enter a Rwandan mobile number, e.g. 0788 123 456',
  })

// Contact + delivery details collected when a customer places a no-pay order.
export const orderDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Add your name'),
  phone: rwandaMobile,
  address: z.string().trim().min(1, 'Add a delivery address'),
  note: z.string().trim().max(500).optional(),
})

export type OrderDetails = z.infer<typeof orderDetailsSchema>
