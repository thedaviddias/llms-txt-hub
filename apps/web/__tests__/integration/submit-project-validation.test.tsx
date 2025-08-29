/**
 * Validation tests for project submission flow
 *
 * Tests form validation, error handling, and error recovery.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectValidationErrors } from '@/__tests__/utils/form-test-helpers'
import { TestSubmitProjectForm } from '@/__tests__/utils/test-components'

// Mock the API calls
const mockCheckUrl = jest.fn()
const mockFetchMetadata = jest.fn()
const mockSubmitProject = jest.fn()

// Make mocks available globally for the test component
;(global as any).mockCheckUrl = mockCheckUrl
;(global as any).mockFetchMetadata = mockFetchMetadata
;(global as any).mockSubmitProject = mockSubmitProject

describe('Submit Project Flow - Validation', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    jest.clearAllMocks()

    mockCheckUrl.mockResolvedValue({ valid: true, exists: false })
    mockFetchMetadata.mockResolvedValue({
      title: 'Fetched Title',
      description: 'Fetched description'
    })
    mockSubmitProject.mockResolvedValue({ success: true })

    user = userEvent.setup()
  })

  describe('Required Field Validation', () => {
    it('shows validation errors for empty required fields', async () => {
      render(<TestSubmitProjectForm />)

      // Try to submit without filling any fields
      await user.click(screen.getByTestId('submit-button'))

      // Check all validation errors appear
      await expectValidationErrors({
        url: 'URL is required',
        title: 'Title is required',
        description: 'Description is required',
        category: 'Category is required',
        tags: 'At least one tag is required'
      })

      // Verify form was not submitted
      expect(mockSubmitProject).not.toHaveBeenCalled()
    })

    it('clears validation errors when fields are corrected', async () => {
      render(<TestSubmitProjectForm />)

      // Submit to trigger validation
      await user.click(screen.getByTestId('submit-button'))

      // Verify error appears
      expect(await screen.findByTestId('url-error')).toBeInTheDocument()

      // Fix the error
      await user.type(screen.getByTestId('url-input'), 'https://example.com')
      await user.tab()

      // Wait for error to clear
      await waitFor(() => {
        expect(screen.queryByTestId('url-error')).not.toBeInTheDocument()
      })
    })
  })

  describe('URL Validation', () => {
    it('shows error for duplicate URLs', async () => {
      // Mock duplicate URL check
      mockCheckUrl.mockResolvedValue({ valid: true, exists: true })

      render(<TestSubmitProjectForm />)

      await user.type(screen.getByTestId('url-input'), 'https://duplicate.com')
      await user.tab()

      expect(await screen.findByTestId('url-error')).toHaveTextContent('This URL already exists')

      // Verify metadata was not fetched for duplicate URL
      expect(mockFetchMetadata).not.toHaveBeenCalled()
    })

    it('handles URL validation failure gracefully', async () => {
      // Mock API error
      mockCheckUrl.mockRejectedValue(new Error('Network error'))

      render(<TestSubmitProjectForm />)

      await user.type(screen.getByTestId('url-input'), 'https://example.com')
      await user.tab()

      expect(await screen.findByTestId('url-error')).toHaveTextContent('Failed to validate URL')
    })
  })

  describe('Metadata Handling', () => {
    it('handles metadata fetch failure gracefully', async () => {
      // URL check succeeds but metadata fails
      mockCheckUrl.mockResolvedValue({ valid: true, exists: false })
      mockFetchMetadata.mockRejectedValue(new Error('Failed to fetch'))

      render(<TestSubmitProjectForm />)

      await user.type(screen.getByTestId('url-input'), 'https://example.com')
      await user.tab()

      await waitFor(() => {
        expect(mockCheckUrl).toHaveBeenCalled()
      })

      // Fields should remain empty when metadata fetch fails
      expect(screen.getByTestId('title-input')).toHaveValue('')
      expect(screen.getByTestId('description-input')).toHaveValue('')
    })
  })

  describe('Submission Error Handling', () => {
    it('handles submission failure with error message', async () => {
      // Mock submission failure
      mockSubmitProject.mockRejectedValue(new Error('Server error'))

      render(<TestSubmitProjectForm />)

      // Fill URL and trigger blur to fetch metadata
      const urlInput = screen.getByTestId('url-input')
      await user.type(urlInput, 'https://example.com')
      await user.tab() // This triggers blur and metadata fetch

      // Wait for metadata fetch to complete
      await waitFor(() => {
        expect(screen.getByTestId('title-input')).toHaveValue('Fetched Title')
      })

      // Now select tags after metadata has been fetched
      fireEvent.click(screen.getByTestId('tag-ai'))
      await waitFor(() => {
        expect(screen.getByTestId('tag-ai')).toBeChecked()
      })

      // Select category (this can be done anytime)
      await user.selectOptions(screen.getByTestId('category-select'), 'AI Tools')

      // Submit
      await user.click(screen.getByTestId('submit-button'))

      // Check error message
      expect(await screen.findByTestId('submit-error')).toHaveTextContent(
        'Failed to submit project'
      )

      // Verify success message is not shown
      expect(screen.queryByTestId('success-message')).not.toBeInTheDocument()
    })
  })
})
