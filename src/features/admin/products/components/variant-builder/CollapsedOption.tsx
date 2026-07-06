import { Database } from 'lucide-react'

import { defaultHexForName } from '../../consts/variant-presets'
import type { BuilderOption } from './types'

// Collapsed option row, mirroring Shopify's option summary once it holds values:
// name, the chosen values as chips, and a type marker pinned to the right.
// Tapping anywhere on the row re-opens the editor.
export function CollapsedOption({
  name,
  values,
  isPreset,
  showSwatch,
  onExpand,
}: {
  name: string
  values: BuilderOption[]
  isPreset: boolean
  showSwatch?: boolean
  onExpand: () => void
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      onClick={onExpand}
      className="hover:bg-muted/40 flex w-full items-start gap-3 px-3 py-3 text-left transition-colors"
    >
      <span className="min-w-0 flex-1 space-y-2">
        <span className="text-sm font-medium">{name}</span>
        {values.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {values.map((o) => (
              <span
                key={o.id}
                className="bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs"
              >
                {showSwatch && (
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-[3px] border"
                    style={{ backgroundColor: defaultHexForName(o.value) }}
                  />
                )}
                {o.value}
              </span>
            ))}
          </span>
        )}
      </span>
      {isPreset && (
        <Database aria-hidden className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      )}
    </button>
  )
}
