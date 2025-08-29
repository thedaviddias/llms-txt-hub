/**
 * Happy path tests for project submission flow
 *
 * Tests the successful completion of the project submission workflow.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectFormSubmission } from '@/__tests__/utils/form-test-helpers'
import { TestSubmitProjectForm } from '@/__tests__/utils/test-components'

// Mock the API calls
const mockCheckUrl = jest.fn()
const mockFetchMetadata = jest.fn()
const mockSubmitProject = jest.fn()

// Make mocks available globally for the test component
;(global as any).mockCheckUrl = mockCheckUrl
;(global as any).mockFetchMetadata = mockFetchMetadata
;(global as any).mockSubmitProject = mockSubmitProject

describe('Submit Project Flow - Happy Path', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    jest.clearAllMocks()

    mockCheckUrl.mockResolvedValue({ valid: true, exists: false })
    mockFetchMetadata.mockResolvedValue({
      title: 'Fetched Title',
      description: 'Fetched description from metadata'
    })
    mockSubmitProject.mockResolvedValue({ success: true, id: 'new-project-id' })

    user = userEvent.setup()
  })

  it('completes full submission flow successfully', async () => {
    render(<TestSubmitProjectForm />)

    // Step 1: Enter URL and trigger metadata fetch
    const urlInput = screen.getByTestId('url-input')
    await user.type(urlInput, 'https://example.com')
    await user.tab()

    // Wait for API calls
    await waitFor(() => {
      expect(mockCheckUrl).toHaveBeenCalledWith('https://example.com')
      expect(mockFetchMetadata).toHaveBeenCalledWith('https://example.com')
    })

    // Verify metadata populated the fields
    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toHaveValue('Fetched Title')
      expect(screen.getByTestId('description-input')).toHaveValue(
        'Fetched description from metadata'
      )
    })

    // Step 2: Select category and tags
    await user.selectOptions(screen.getByTestId('category-select'), 'AI Tools')
    fireEvent.click(screen.getByTestId('tag-ai'))
    fireEvent.click(screen.getByTestId('tag-productivity'))

    // Step 3: Submit form
    await user.click(screen.getByTestId('submit-button'))

    // Verify submission
    await expectFormSubmission(mockSubmitProject, {
      url: 'https://example.com',
      title: 'Fetched Title',
      description: 'Fetched description from metadata',
      category: 'AI Tools',
      tags: ['ai', 'productivity']
    })

    // Verify success message
    expect(await screen.findByTestId('success-message')).toBeInTheDocument()
    expect(screen.getByText('Project submitted successfully!')).toBeInTheDocument()
  })

  it('allows manual editing of auto-populated fields', async () => {
    render(<TestSubmitProjectForm />)

    // Enter URL and wait for metadata
    await user.type(screen.getByTestId('url-input'), 'https://example.com')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByTestId('title-input')).toHaveValue('Fetched Title')
    })

    // Manually edit the title
    const titleInput = screen.getByTestId('title-input')
    await user.clear(titleInput)
    await user.type(titleInput, 'Custom Title')

    // Fill other required fields
    const descriptionInput = screen.getByTestId('description-input')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Custom description')

    // Select category
    await user.selectOptions(screen.getByTestId('category-select'), 'Development')

    // Select tags
    fireEvent.click(screen.getByTestId('tag-development'))

    await user.click(screen.getByTestId('submit-button'))

    // Verify custom title was submitted
    await expectFormSubmission(mockSubmitProject, {
      title: 'Custom Title',
      description: 'Custom description',
      category: 'Development',
      tags: ['development']
    })
  })

  it('handles form completion with minimal valid data', async () => {
    render(<TestSubmitProjectForm />)

    // Fill URL first and wait for metadata
    const urlInput = screen.getByTestId('url-input')
    await user.type(urlInput, 'https://minimal.com')
    await user.tab()

    // Wait for metadata fetch to complete
    await waitFor(() => {
      expect(mockCheckUrl).toHaveBeenCalledWith('https://minimal.com')
      expect(mockFetchMetadata).toHaveBeenCalledWith('https://minimal.com')
    })

    // Now override with minimal values
    const titleInput = screen.getByTestId('title-input')
    await user.clear(titleInput)
    await user.type(titleInput, 'Min')

    const descriptionInput = screen.getByTestId('description-input')
    await user.clear(descriptionInput)
    await user.type(descriptionInput, 'Min desc')

    await user.selectOptions(screen.getByTestId('category-select'), 'Development')
    fireEvent.click(screen.getByTestId('tag-development'))

    await user.click(screen.getByTestId('submit-button'))

    await expectFormSubmission(mockSubmitProject, {
      url: 'https://minimal.com',
      title: 'Min',
      description: 'Min desc',
      category: 'Development',
      tags: ['development']
    })

    expect(await screen.findByTestId('success-message')).toBeInTheDocument()
  })
})
