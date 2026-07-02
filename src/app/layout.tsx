import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import { Toaster } from '@/shared/ui'
import { ThemeProvider } from '@/shared/components/theme-provider'
import './globals.css'
import { cn } from '@/shared/lib/utils'

// Applied before paint so a dark-mode choice doesn't flash light on load.
// Rendered from the server layout, where an inline script is valid (next-themes
// renders the equivalent inside a client component, which React 19 rejects).

// Deliberate pairing: a characterful display face for headings, a highly legible
// body face for product/admin copy — chosen over the Geist starter default.
const display = Bricolage_Grotesque({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
})

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Zita Boutique',
  description: 'Affordable fashion — browse, pick, and chat to order.',
  applicationName: 'Zita Boutique',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Zita' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  // Hex of the storefront's light/dark --background tokens (oklch 1 / 0.145).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={cn('h-full', 'antialiased', display.variable, 'font-sans', figtree.variable)}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
