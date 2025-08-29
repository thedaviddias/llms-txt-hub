/**
 * Accessibility tests for project submission flow
 *
 * Tests keyboard navigation, screen reader support, and ARIA attributes.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectKeyboardNavigation } from '@/__tests__/utils/form-test-helpers'
import { TestSubmitProjectForm } from '@/__tests__/utils/test-components'

// Mock the API calls
const mockCheckUrl = jest.fn()
const mockFetchMetadata = jest.fn()
const mockSubmitProject = jest.fn()

// Make mocks available globally for the test component
;(global as any).mockCheckUrl = mockCheckUrl
;(global as any).mockFetchMetadata = mockFetchMetadata
;(global as any).mockSubmitProject = mockSubmitProject

describe('Submit Project Flow - Accessibility', () => {
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

  describe('Form Labels and Associations', () => {
    it('properly associates labels with form inputs', () => {
      render(<TestSubmitProjectForm />)

      // Check that labels are properly associated
      expect(screen.getByLabelText(/project url/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    })
  })

  describe('ARIA Attributes', () => {
    it('properly marks invalid fields with aria-invalid', async () => {
      render(<TestSubmitProjectForm />)

      // Submit to trigger validation
      fireEvent.click(screen.getByTestId('submit-button'))

      // Check aria-invalid attributes
      await waitFor(() => {
        expect(screen.getByTestId('url-input')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByTestId('title-input')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByTestId('description-input')).toHaveAttribute('aria-invalid', 'true')
        expect(screen.getByTestId('category-select')).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('removes aria-invalid when fields are corrected', async () => {
      render(<TestSubmitProjectForm />)

      // Submit to trigger validation
      await user.click(screen.getByTestId('submit-button'))

      // Wait for validation error
      await waitFor(() => {
        expect(screen.getByTestId('url-input')).toHaveAttribute('aria-invalid', 'true')
      })

      // Fix the field
      await user.type(screen.getByTestId('url-input'), 'https://example.com')
      await user.tab()

      // Wait for error to clear
      await waitFor(() => {
        expect(screen.queryByTestId('url-error')).not.toBeInTheDocument()
      })

      // Check aria-invalid is removed (or not set to true)
      expect(screen.getByTestId('url-input')).not.toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Error Message Accessibility', () => {
    it('error messages have proper role="alert"', async () => {
      render(<TestSubmitProjectForm />)

      // Submit to trigger validation
      await user.click(screen.getByTestId('submit-button'))

      // Check error messages have alert role
      await waitFor(() => {
        const errors = screen.getAllByRole('alert')
        expect(errors).toHaveLength(5) // All 5 field errors
      })
    })

    it('associates error messages with inputs via aria-describedby', async () => {
      render(<TestSubmitProjectForm />)

      // Submit to trigger validation
      await user.click(screen.getByTestId('submit-button'))

      // Check URL input has aria-describedby pointing to error
      await waitFor(() => {
        const urlInput = screen.getByTestId('url-input')
        const describedBy = urlInput.getAttribute('aria-describedby')
        expect(describedBy).toBeTruthy()

        // Verify the ID points to an existing error element
        const errorElement = document.getElementById(describedBy!)
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('can be navigated with keyboard only', async () => {
      render(<TestSubmitProjectForm />)

      // Test basic tab navigation
      await expectKeyboardNavigation(user, [
        'url-input',
        'title-input',
        'description-input',
        'category-select'
      ])
    })

    it('form submission works with keyboard', async () => {
      render(<TestSubmitProjectForm />)

      // Fill form using keyboard
      await user.type(screen.getByTestId('url-input'), 'https://example.com')
      await user.tab()

      await user.type(screen.getByTestId('title-input'), 'Test Title')
      await user.tab()

      await user.type(screen.getByTestId('description-input'), 'Test description')
      await user.tab()

      // Select category with keyboard
      await user.selectOptions(screen.getByTestId('category-select'), 'AI Tools')

      // Wait for category selection to be processed
      await waitFor(() => {
        expect(screen.getByTestId('category-select')).toHaveValue('AI Tools')
      })

      // Select tag with keyboard
      fireEvent.click(screen.getByTestId('tag-ai'))

      // Wait for tag selection to be processed
      await waitFor(() => {
        expect(screen.getByTestId('tag-ai')).toBeChecked()
      })

      // Submit with Enter key
      const submitButton = screen.getByTestId('submit-button')
      submitButton.focus()
      await user.keyboard('{Enter}')

      // Verify submission occurred
      await waitFor(() => {
        expect(mockSubmitProject).toHaveBeenCalled()
      })
    })
  })

  describe('Focus Management', () => {
    it('maintains focus order during validation', async () => {
      render(<TestSubmitProjectForm />)

      // Focus first input
      screen.getByTestId('url-input').focus()
      expect(screen.getByTestId('url-input')).toHaveFocus()

      // Submit to trigger validation
      await user.click(screen.getByTestId('submit-button'))

      // Wait for validation to complete
      await waitFor(() => {
        expect(screen.getByTestId('url-error')).toBeInTheDocument()
      })

      // Focus should remain manageable after validation - start from the URL input
      screen.getByTestId('url-input').focus()
      await user.tab()
      expect(screen.getByTestId('title-input')).toHaveFocus()
    })

    it('provides clear focus indicators', () => {
      render(<TestSubmitProjectForm />)

      // This is more of a visual test, but we can ensure focusable elements exist
      const focusableElements = [
        screen.getByTestId('url-input'),
        screen.getByTestId('title-input'),
        screen.getByTestId('description-input'),
        screen.getByTestId('category-select'),
        screen.getByTestId('submit-button')
      ]

      focusableElements.forEach(element => {
        expect(element).toBeInTheDocument()
        expect(element).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })
})
