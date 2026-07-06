import { z } from 'zod'

const email = z.string().email('Enter a valid email')

// Sign-in accepts any existing password; registration enforces the 6-char
// minimum Supabase requires.
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z.object({
  email,
  password: z.string().min(6, 'Use at least 6 characters'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
