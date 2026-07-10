'use client'

import { cn } from '@/shared/lib/utils'

// Round, translucent icon control that floats over a photo (PDP back/bag,
// favorite + share floats, the card favorite chrome). Renders as a <button> by
// default; pass `as="span"` to use it purely as visual chrome inside a larger
// tap-target button (the card FavoriteButton keeps a 44px target around a
// smaller circle).
type IconButtonProps = {
  as?: 'button'
  size?: 'sm' | 'md'
} & React.ComponentProps<'button'>

type IconChromeProps = {
  as: 'span'
  size?: 'sm' | 'md'
} & React.ComponentProps<'span'>

const chrome = 'bg-background/80 grid place-items-center rounded-full backdrop-blur'
const sizes = { sm: 'size-8', md: 'size-10' } as const

export function IconButton({
  as = 'button',
  size = 'md',
  className,
  ...props
}: IconButtonProps | IconChromeProps) {
  if (as === 'span') {
    return (
      <span
        className={cn(chrome, sizes[size], className)}
        {...(props as React.ComponentProps<'span'>)}
      />
    )
  }
  return (
    <button
      type="button"
      className={cn(chrome, sizes[size], className)}
      {...(props as React.ComponentProps<'button'>)}
    />
  )
}
