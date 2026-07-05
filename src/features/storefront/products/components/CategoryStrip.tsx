import Link from 'next/link'
import Image from 'next/image'

// Mobile-only shortcuts at the very start of the feed: circular garment
// illustrations that jump straight to a category. Hidden on md+, where the
// desktop category sidebar already covers this.
const SHORTCUTS = [
  { label: "Iz'ibirori", href: '/category/ibirori', image: '/dress.svg' },
  { label: "Iz'ikoboyi", href: '/category/ikoboyi', image: '/jean%20dress.svg' },
  { label: 'Complet', href: '/category/complet', image: '/complet.svg' },
  { label: 'Boubou', href: '/category/boubou', image: '/boubou.svg' },
]

export function CategoryStrip() {
  return (
    <nav className="flex [scrollbar-width:none] items-start gap-6 overflow-x-auto px-4 pt-4 pb-3 md:hidden">
      {SHORTCUTS.map((cat) => (
        <Link key={cat.href} href={cat.href} className="flex shrink-0 flex-col items-center gap-2">
          <span className="bg-muted relative size-16 overflow-hidden rounded-full">
            <Image
              src={cat.image}
              alt={cat.label}
              fill
              sizes="8px"
              className="object-cover"
              unoptimized
            />
          </span>
          <span className="text-foreground text-xs tracking-wide">{cat.label}</span>
        </Link>
      ))}
    </nav>
  )
}
