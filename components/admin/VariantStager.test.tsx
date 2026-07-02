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
  it('offers the common fashion types as presets in the add menu', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /add options/i }))
    expect(screen.getByRole('button', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Colour' })).toBeInTheDocument()
  })

  it('toggles a preset option on and off by ticking its checkbox', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /add options/i }))
    await user.click(screen.getByRole('button', { name: 'Size' }))
    await user.click(screen.getByRole('button', { name: /size values/i }))
    expect(await screen.findByRole('checkbox', { name: 'M' })).not.toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'M' }))
    expect(await screen.findByRole('checkbox', { name: 'M' })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: 'M' }))
    expect(await screen.findByRole('checkbox', { name: 'M' })).not.toBeChecked()
  })

  it('still supports a custom type with freeform options', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: /add options/i }))
    await user.click(screen.getByRole('button', { name: /create custom option/i }))
    await user.type(screen.getByRole('textbox', { name: /new option name/i }), 'Style')
    await user.click(screen.getByRole('button', { name: /add group/i }))
    expect(screen.getByText('Style')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/add a value/i), 'Cropped')
    await user.click(screen.getByRole('button', { name: /add option/i }))
    expect(screen.getByText('Cropped')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove cropped/i }))
    expect(screen.queryByText('Cropped')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /delete style group/i }))
    expect(screen.queryByText('Style')).not.toBeInTheDocument()
  })
})
