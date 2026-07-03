'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { productFormSchema } from '../services/products.schema'

// The editor collects everything except slug (derived on create, fixed on edit).
// categoryId is a plain string here ('' = Uncategorized); the server maps '' → null.
export const productEditorSchema = productFormSchema
  .omit({ slug: true })
  // categoryId as a plain string ('' allowed); visible without the schema default
  // so RHF's input/output value types match (defaultValues always supplies it).
  .extend({ categoryId: z.string(), visible: z.boolean() })

export type ProductEditorValues = z.infer<typeof productEditorSchema>

interface ProductDefaults {
  name?: string
  price?: string
  description?: string | null
  categoryId?: string | null
  visible?: boolean
}

export function useProductForm(product?: ProductDefaults) {
  return useForm<ProductEditorValues>({
    resolver: zodResolver(productEditorSchema),
    defaultValues: {
      name: product?.name ?? '',
      price: product?.price ?? '',
      description: product?.description ?? '',
      categoryId: product?.categoryId ?? '',
      visible: product?.visible ?? true,
    },
  })
}
