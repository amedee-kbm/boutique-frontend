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
  it('offers the common fashion types as presets', () => {
    render(<Harness />)
    expect(screen.getByRole('heading', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Weight' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Colour' })).toBeInTheDocument()
  })

  it('toggles a preset option on and off by tapping its chip', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'M' }))
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'M' }))
    expect(screen.getByRole('button', { name: 'M' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('still supports a custom type with freeform options', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByPlaceholderText(/new type/i), 'Style')
    await user.click(screen.getByRole('button', { name: /add group/i }))
    expect(screen.getByText('Style')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/add an option/i), 'Cropped')
    await user.click(screen.getByRole('button', { name: /add option/i }))
    expect(screen.getByText('Cropped')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove cropped/i }))
    expect(screen.queryByText('Cropped')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete style group/i }))
    expect(screen.queryByText('Style')).not.toBeInTheDocument()
  })
})
