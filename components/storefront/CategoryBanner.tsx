import Link from 'next/link'
import Image from 'next/image'

export interface CategoryBannerData {
  id: string
  name: string
  slug: string
  productCount: number
  image: string | null
}

export function CategoryBanner({ category }: { category: CategoryBannerData }) {
  return (
    <Link href={`/category/${category.slug}`} className="group relative block">
      <div className="bg-muted relative aspect-[2/1] w-full overflow-hidden">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <h2 className="font-heading text-lg font-semibold tracking-[0.2em] uppercase">
            {category.name}
          </h2>
          <p className="mt-1 text-xs tracking-wide">
            {category.productCount} {category.productCount === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
      </div>
    </Link>
  )
}
