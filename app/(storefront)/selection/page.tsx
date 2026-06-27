import { SelectionList } from '@/components/storefront/SelectionList'

export const metadata = { title: 'Your selection — Zita Boutique' }

export default function SelectionPage() {
  return (
    <div className="mx-auto w-full md:max-w-2xl">
      <div className="border-b px-4 py-3">
        <h1 className="font-heading text-base font-semibold tracking-[0.2em] uppercase">
          Your selection
        </h1>
      </div>
      <SelectionList />
    </div>
  )
}
