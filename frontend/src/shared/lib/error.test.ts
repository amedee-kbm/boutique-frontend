import { describe, expect, it } from 'vitest'

import { firstZodError, getErrorMessage, isUniqueViolation } from './error'

describe('getErrorMessage', () => {
  it('reads the message off an Error', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('falls back when the message is blank, not just absent', () => {
    expect(getErrorMessage({ message: '   ' }, 'fallback')).toBe('fallback')
  })

  it('falls back on a thrown string, null, or undefined', () => {
    expect(getErrorMessage('boom', 'fallback')).toBe('fallback')
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback')
  })
})

describe('firstZodError', () => {
  it('returns the first issue message', () => {
    expect(firstZodError({ issues: [{ message: 'Name required' }, { message: 'ignored' }] })).toBe(
      'Name required'
    )
  })

  it('falls back when a parse failed with no issues', () => {
    expect(firstZodError({ issues: [] }, 'Invalid')).toBe('Invalid')
  })
})

describe('isUniqueViolation', () => {
  it('recognises SQLSTATE 23505', () => {
    // A slug collision must be told apart from every other database failure,
    // or the admin blames the slug for an unrelated outage.
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
  })

  it('rejects any other error code, and non-errors', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false)
    expect(isUniqueViolation(new Error('boom'))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation('23505')).toBe(false)
  })
})
