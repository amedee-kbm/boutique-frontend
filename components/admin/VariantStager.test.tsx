import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { VariantStager, type StagedVariantGroup } from '@/components/admin/VariantStager'

function Harness() {
  const [groups, setGroups] = useState<StagedVariantGroup[]>([])
  return <VariantStager groups={groups} onChange={setGroups} />
}

describe('VariantStager', () => {
  it('shows an empty hint with no groups', () => {
    render(<Harness />)
    expect(screen.getByText(/no variants yet/i)).toBeInTheDocument()
  })

  it('adds a group, then options to it, and removes them', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByPlaceholderText(/new group/i), 'Size')
    await user.click(screen.getByRole('button', { name: /add group/i }))
    expect(screen.getByText('Size')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/add an option/i), 'M')
    await user.click(screen.getByRole('button', { name: /add option/i }))
    expect(screen.getByText('M')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove m/i }))
    expect(screen.queryByText('M')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete size group/i }))
    expect(screen.queryByText('Size')).not.toBeInTheDocument()
    expect(screen.getByText(/no variants yet/i)).toBeInTheDocument()
  })
})
