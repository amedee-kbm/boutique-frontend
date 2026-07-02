import { z } from 'zod'

export const categoryFilterSchema = z.object({
  name: z.string().min(1, 'Filter name is required').max(50),
})

export const categoryFilterOptionSchema = z.object({
  value: z.string().min(1, 'Option is required').max(50),
})
