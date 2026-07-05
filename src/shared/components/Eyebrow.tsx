import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

// The tiny wide-tracked caps label used for section labels, nav labels and field
// labels. Canonical token: 11px / 0.15em / uppercase, weight left to context.
const eyebrowVariants = cva('text-[11px] tracking-[0.15em] uppercase')

type EyebrowOwnProps = { className?: string; children?: ReactNode }

type EyebrowProps<T extends ElementType> = EyebrowOwnProps & {
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof EyebrowOwnProps | 'as'>

export function Eyebrow<T extends ElementType = 'span'>({
  as,
  className,
  ...props
}: EyebrowProps<T>) {
  const Comp: ElementType = as ?? 'span'
  return <Comp className={cn(eyebrowVariants(), className)} {...props} />
}

export { eyebrowVariants }
