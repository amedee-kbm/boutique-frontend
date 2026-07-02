'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'

import { Input } from '@/shared/ui'
import { cn } from '@/shared/lib/utils'

interface FloatingLabelInputProps extends Omit<ComponentProps<typeof Input>, 'id' | 'prefix'> {
  label: string
  helperText?: string
  /** Static adornment shown before the value, e.g. a currency code. */
  prefix?: ReactNode
}

export function FloatingLabelInput({
  label,
  helperText,
  prefix,
  className,
  ...inputProps
}: FloatingLabelInputProps) {
  const id = useId()

  return (
    <div className="space-y-1">
      <div className="border-input focus-within:border-ring focus-within:ring-ring/50 rounded-lg border px-3 pt-1.5 pb-1 transition-shadow focus-within:ring-3">
        <label htmlFor={id} className="text-muted-foreground block text-xs">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-muted-foreground text-sm">{prefix}</span>}
          <Input
            id={id}
            className={cn(
              'h-7 rounded-none border-0 px-0 shadow-none focus-visible:border-0 focus-visible:ring-0',
              className
            )}
            {...inputProps}
          />
        </div>
      </div>
      {helperText && <p className="text-muted-foreground px-1 text-xs">{helperText}</p>}
    </div>
  )
}
