import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

vi.mock('@/lib/actions/products', () => ({
  deleteProductImage: vi.fn(),
  reorderProductImages: vi.fn(),
  updateProductImageAlt: vi.fn(),
  uploadProductImage: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  deleteProductImage,
  updateProductImageAlt,
  uploadProductImage,
} from '@/lib/actions/products'
import { toast } from 'sonner'
import { ProductImageManager } from '@/components/admin/ProductImageManager'

const images = [
  { id: 'img1', url: 'https://cdn/1.jpg', alt: 'Front' },
  { id: 'img2', url: 'https://cdn/2.jpg', alt: null },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductImageManager', () => {
  it('renders the upload dropzone prompt', () => {
    render(<ProductImageManager productId="p1" initialImages={[]} />)
    expect(screen.getByText(/drag photos here/i)).toBeInTheDocument()
  })

  it('renders the existing images with their alt text', () => {
    render(<ProductImageManager productId="p1" initialImages={images} />)
    expect(screen.getByAltText('Front')).toBeInTheDocument()
    const altInputs = screen.getAllByLabelText('Image alt text')
    expect(altInputs).toHaveLength(2)
    expect(altInputs[0]).toHaveValue('Front')
  })

  it('uploads a dropped file and refreshes', async () => {
    vi.mocked(uploadProductImage).mockResolvedValue({ error: null, url: 'https://cdn/new.jpg' })
    const user = userEvent.setup()
    const { container } = render(<ProductImageManager productId="p1" initialImages={[]} />)

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
    render(<ProductImageManager productId="p1" initialImages={images} />)

    const firstImageCell = screen.getByAltText('Front').closest('div') as HTMLElement
    await user.click(within(firstImageCell).getByRole('button', { name: /remove image/i }))

    expect(deleteProductImage).toHaveBeenCalledWith('img1')
    await waitFor(() => expect(screen.queryByAltText('Front')).not.toBeInTheDocument())
  })

  it('restores the image when deletion fails', async () => {
    vi.mocked(deleteProductImage).mockResolvedValue({ error: 'Boom' })
    const user = userEvent.setup()
    render(<ProductImageManager productId="p1" initialImages={images} />)

    const firstImageCell = screen.getByAltText('Front').closest('div') as HTMLElement
    await user.click(within(firstImageCell).getByRole('button', { name: /remove image/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Boom'))
    expect(screen.getByAltText('Front')).toBeInTheDocument()
  })

  it('saves alt text when the field loses focus and the value changed', async () => {
    vi.mocked(updateProductImageAlt).mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ProductImageManager productId="p1" initialImages={images} />)

    const altInput = screen.getAllByLabelText('Image alt text')[0]
    await user.clear(altInput)
    await user.type(altInput, 'Back view')
    await user.tab()

    await waitFor(() => expect(updateProductImageAlt).toHaveBeenCalledWith('img1', 'Back view'))
  })

  it('does not save alt text when the value is unchanged', async () => {
    const user = userEvent.setup()
    render(<ProductImageManager productId="p1" initialImages={images} />)

    const altInput = screen.getAllByLabelText('Image alt text')[0]
    await user.click(altInput)
    await user.tab()

    expect(updateProductImageAlt).not.toHaveBeenCalled()
  })
})
