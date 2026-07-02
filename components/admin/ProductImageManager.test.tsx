import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

vi.mock('@/lib/actions/products', () => ({
  deleteProductImage: vi.fn(),
  reorderProductImages: vi.fn(),
  setProductImageOption: vi.fn(),
  uploadProductImage: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  deleteProductImage,
  setProductImageOption,
  uploadProductImage,
} from '@/lib/actions/products'
import { toast } from 'sonner'
import { ProductImageManager } from '@/components/admin/ProductImageManager'

const images = [
  { id: 'img1', url: 'https://cdn/1.jpg', alt: 'Front', optionId: null },
  { id: 'img2', url: 'https://cdn/2.jpg', alt: null, optionId: null },
]

const colorOptions = [
  { id: 'opt-red', value: 'Red', hex: '#d92d20' },
  { id: 'opt-blue', value: 'Blue', hex: '#2563eb' },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductImageManager', () => {
  it('renders the upload dropzone prompt', () => {
    render(<ProductImageManager productId="p1" initialImages={[]} colorOptions={[]} />)
    expect(screen.getByText('Add images')).toBeInTheDocument()
  })

  it('renders the existing images', () => {
    render(<ProductImageManager productId="p1" initialImages={images} colorOptions={[]} />)
    expect(screen.getByAltText('Front')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /remove image/i })).toHaveLength(2)
  })

  it('uploads a dropped file and refreshes', async () => {
    vi.mocked(uploadProductImage).mockResolvedValue({ error: null, url: 'https://cdn/new.jpg' })
    const user = userEvent.setup()
    const { container } = render(
      <ProductImageManager productId="p1" initialImages={[]} colorOptions={[]} />
    )

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await user.upload(input, file)

    await waitFor(() => expect(uploadProductImage).toHaveBeenCalledWith('p1', expect.any(FormData)))
    const formData = vi.mocked(uploadProductImage).mock.calls[0][1] as FormData
    expect((formData.get('file') as File).name).toBe('photo.png')
    expect(toast.success).toHaveBeenCalledWith('Images uploaded')
    expect(refresh).toHaveBeenCalled()
  })

  it('optimistically removes an image and calls the delete action', async () => {
    vi.mocked(deleteProductImage).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ProductImageManager productId="p1" initialImages={images} colorOptions={[]} />)

    const firstImageCell = screen.getByAltText('Front').closest('div') as HTMLElement
    await user.click(within(firstImageCell).getByRole('button', { name: /remove image/i }))

    expect(deleteProductImage).toHaveBeenCalledWith('img1')
    await waitFor(() => expect(screen.queryByAltText('Front')).not.toBeInTheDocument())
  })

  it('restores the image when deletion fails', async () => {
    vi.mocked(deleteProductImage).mockResolvedValue({ error: 'Boom' })
    const user = userEvent.setup()
    render(<ProductImageManager productId="p1" initialImages={images} colorOptions={[]} />)

    const firstImageCell = screen.getByAltText('Front').closest('div') as HTMLElement
    await user.click(within(firstImageCell).getByRole('button', { name: /remove image/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Boom'))
    expect(screen.getByAltText('Front')).toBeInTheDocument()
  })

  it('assigns a colour option to an image', async () => {
    vi.mocked(setProductImageOption).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(
      <ProductImageManager productId="p1" initialImages={images} colorOptions={colorOptions} />
    )

    await user.click(screen.getAllByRole('button', { name: /assign colour/i })[0])
    await user.click(await screen.findByRole('menuitem', { name: 'Red' }))

    await waitFor(() => expect(setProductImageOption).toHaveBeenCalledWith('img1', 'opt-red'))
  })
})
