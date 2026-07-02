// Cross-group shared types (used by both storefront and admin features).

// A category's filter facet and its options. Shared by the admin category
// editor, the storefront filter sheet, and the admin product editor.
export interface CategoryFilter {
  id: string
  name: string
  options: { id: string; value: string }[]
}
