import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/shared/lib/utils'

// The larger wide-tracked caps heading used for page/section titles. Canonical
// token: Bricolage (font-heading) / 16px / 0.2em / semibold / uppercase.
const sectionTitleVariants = cva('font-heading text-base font-semibold tracking-[0.2em] uppercase')

type SectionTitleOwnProps = { className?: string; children?: ReactNode }

type SectionTitleProps<T extends ElementType> = SectionTitleOwnProps & {
  as?: T
} & Omit<ComponentPropsWithoutRef<T>, keyof SectionTitleOwnProps | 'as'>

export function SectionTitle<T extends ElementType = 'h2'>({
  as,
  className,
  ...props
}: SectionTitleProps<T>) {
  const Comp: ElementType = as ?? 'h2'
  return <Comp className={cn(sectionTitleVariants(), className)} {...props} />
}

export { sectionTitleVariants }
