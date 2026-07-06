'use client'

import { useState } from 'react'

const PLACEHOLDER = '/placeholder.svg'

interface ProductThumbProps {
  src?: string | null
  alt?: string
  className?: string
}

export function ProductThumb({ src, alt = '', className }: ProductThumbProps) {
  const [failed, setFailed] = useState(false)
  const resolved = failed || !src ? PLACEHOLDER : src

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={resolved} alt={alt} onError={() => setFailed(true)} className={className} />
  )
}
