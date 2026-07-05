import { cn } from '@/shared/lib/utils'

// Dashed-border placeholder for an empty list (no products, orders, categories,
// chats). Collapses the hand-rolled variants; icon is optional.
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center',
        className
      )}
    >
      {Icon && <Icon className="text-muted-foreground size-8" />}
      <p className="text-muted-foreground text-sm">{title}</p>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  )
}
