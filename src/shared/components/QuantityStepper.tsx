'use client'

import { Minus, Plus } from 'lucide-react'

import { cn } from '@/shared/lib/utils'

interface QuantityStepperProps {
  value: number
  onChange: (next: number) => void
  // `sm` is the compact bag-line stepper; `lg` is the purchase-sheet stepper.
  size?: 'sm' | 'lg'
  // When set, the decrement button is disabled at the floor. Leave undefined to
  // let the caller's onChange decide (e.g. the bag removes a line at zero).
  min?: number
  // Suffix for the aria-labels, e.g. the product name ("Decrease quantity of X").
  name?: string
}

export function QuantityStepper({ value, onChange, size = 'lg', min, name }: QuantityStepperProps) {
  const suffix = name ? ` of ${name}` : ''
  const atMin = min !== undefined && value <= min
  const button =
    size === 'sm'
      ? 'grid size-8 place-items-center rounded-full border hover:bg-muted'
      : 'grid size-11 place-items-center rounded-full border hover:bg-muted disabled:opacity-40'
  const icon = size === 'sm' ? 'size-3.5' : 'size-4'
  const readout = size === 'sm' ? 'w-6 text-sm' : 'w-8 text-base'

  return (
    <div className={cn('flex items-center', size === 'sm' ? 'gap-1' : 'gap-3')}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={atMin}
        aria-label={`Decrease quantity${suffix}`}
        className={button}
      >
        <Minus className={icon} />
      </button>
      <span className={cn('text-center tabular-nums', readout)}>{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase quantity${suffix}`}
        className={button}
      >
        <Plus className={icon} />
      </button>
    </div>
  )
}
