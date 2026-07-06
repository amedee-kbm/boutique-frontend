import { z } from 'zod'

export const homeFilterEntrySchema = z.object({
  label: z.string().trim().min(1, 'Label is required').max(60),
  href: z.string().trim().min(1, 'Link is required').max(200),
  visible: z.boolean(),
})

export const homeFiltersSchema = z.array(homeFilterEntrySchema).max(30)

export type HomeFilterEntry = z.infer<typeof homeFilterEntrySchema>
