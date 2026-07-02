// Rwandan Franc has no minor unit — prices display as whole, grouped francs.
export function formatPrice(price: string | number): string {
  const amount = typeof price === 'number' ? price : Number(price)
  if (!Number.isFinite(amount)) return String(price)
  return `RWF ${new Intl.NumberFormat('en-US').format(Math.round(amount))}`
}
