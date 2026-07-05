import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/lib/utils'

// Solid pill showing a small count (bag items, active filters, unread chats).
// Wraps the Badge primitive with a compact count look; pass `className` for
// positioning (e.g. absolute placement over an icon button).
export function CountBadge({ count, className }: { count: number; className?: string }) {
  return (
    <Badge
      variant="count"
      className={cn(
        'h-auto min-w-4 justify-center rounded-full px-1 py-0 text-[10px] leading-4',
        className
      )}
    >
      {count}
    </Badge>
  )
}
