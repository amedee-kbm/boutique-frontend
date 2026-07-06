export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

// The first validation message off a failed Zod safeParse, or a fallback.
// Replaces the `parsed.error.issues[0]?.message ?? '…'` idiom repeated across
// the service actions.
export const firstZodError = (
  error: { issues: { message: string }[] },
  fallback = 'Invalid input'
): string => error.issues[0]?.message ?? fallback

// Postgres unique-constraint violation (SQLSTATE 23505). Lets a service tell a
// genuine slug collision apart from any other DB failure instead of blaming
// every error on the slug.
export const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === '23505'
