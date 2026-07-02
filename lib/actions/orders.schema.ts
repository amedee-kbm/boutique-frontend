import { z } from 'zod'

export const orderStatusSchema = z.enum(['new', 'contacted', 'done'])

export type OrderStatusValue = z.infer<typeof orderStatusSchema>
