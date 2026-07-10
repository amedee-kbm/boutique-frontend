export const metadata = { title: 'Back soon — Zita Boutique' }

export default function MaintenancePage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[480px] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-heading text-2xl font-semibold">We’ll be right back</h1>
      <p className="text-muted-foreground text-sm">
        Zita Boutique is briefly down for maintenance. Please check back in a little while.
      </p>
    </div>
  )
}
