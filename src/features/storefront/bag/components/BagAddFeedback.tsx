'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

import { useBag } from '../hooks/useBag'

// The single place add-to-bag feedback lives. Every add (from the product sheet,
// from favorites, …) bumps the bag's addNonce; this fires one toast off that
// signal. To drop the toast, delete this component's body; to swap it for
// something else, change it here — the add sites stay dumb.
export function BagAddFeedback() {
  const { addNonce } = useBag()

  useEffect(() => {
    if (addNonce === 0) return
    toast.success('Added to your bag')
  }, [addNonce])

  return null
}
