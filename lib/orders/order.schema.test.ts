import { describe, expect, it } from 'vitest'

import { orderDetailsSchema } from './order.schema'

const base = { name: 'Aline', address: 'KN 5 Rd, Kigali' }

function parsePhone(phone: string) {
  return orderDetailsSchema.safeParse({ ...base, phone })
}

describe('orderDetailsSchema phone (Rwandan mobile)', () => {
  it('accepts a local 07… number', () => {
    const result = parsePhone('0788123456')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('0788123456')
  })

  it.each(['0722123456', '0733123456', '0788123456', '0799123456'])(
    'accepts second digit %s',
    (phone) => {
      expect(parsePhone(phone).success).toBe(true)
    }
  )

  it('normalizes a +250 country prefix to the local 0… form', () => {
    const result = parsePhone('+250788123456')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('0788123456')
  })

  it('normalizes a bare 250 prefix and strips spaces', () => {
    const result = parsePhone('250 788 123 456')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.phone).toBe('0788123456')
  })

  it.each([
    '0700123456', // second digit not in 2/3/8/9
    '078812345', // too short
    '07881234567', // too long
    '0241234567', // landline-style prefix
    'not a phone',
  ])('rejects %s', (phone) => {
    expect(parsePhone(phone).success).toBe(false)
  })
})
