import { z } from 'zod'

export const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  description: z.string().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price like 5000'),
  categoryId: z.string().uuid().optional().nullable(),
  visible: z.boolean().default(true),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
