// Cross-group shared types (used by both storefront and admin features).

// A category's filter facet and its options. Shared by the admin category
// editor, the storefront filter sheet, and the admin product editor.
export interface CategoryFilter {
  id: string
  name: string
  options: { id: string; value: string }[]
}

// A product snapshot attached to a chat message. Shared by the storefront guest
// chat, the admin conversation, and the admin chat read.
export interface InquiryItem {
  id: string
  // Null once the product is deleted; slug is null when it's also hidden/gone.
  productId: string | null
  slug: string | null
  name: string
  colorValue: string | null
  sizeValue: string | null
  price: string
  imageUrl: string | null
}
