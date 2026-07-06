import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
