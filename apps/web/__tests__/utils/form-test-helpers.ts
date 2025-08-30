/**
 * Helper functions for form testing
 *
 * Centralized utilities for common form testing operations
 * to reduce duplication and improve test maintainability.
 */

import { fireEvent, screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'

/**
 * Helper to fill out the submit project form with valid data
 *
 * @param user - User event instance
 * @param overrides - Optional field overrides
 * @returns Promise that resolves when form is filled
 */
export async function fillSubmitProjectForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<{
    url: string
    title: string
    description: string
    category: string
    tags: string[]
  }> = {}
) {
  const defaults = {
    url: 'https://example.com',
    title: 'Test Project',
    description: 'Test description',
    category: 'AI Tools',
    tags: ['ai']
  }

  const values = { ...defaults, ...overrides }

  // Fill URL
  const urlInput = screen.getByTestId('url-input')
  await user.clear(urlInput)
  await user.type(urlInput, values.url)

  // Fill title - always clear first to handle existing content
  const titleInput = screen.getByTestId('title-input')
  await user.clear(titleInput)
  await user.type(titleInput, values.title)

  // Fill description - always clear first to handle existing content
  const descriptionInput = screen.getByTestId('description-input')
  await user.clear(descriptionInput)
  await user.type(descriptionInput, values.description)

  // Select category
  await user.selectOptions(screen.getByTestId('category-select'), values.category)

  // Select tags
  for (const tag of values.tags) {
    fireEvent.click(screen.getByTestId(`tag-${tag}`))
  }
}

/**
 * Helper to verify validation errors are shown
 *
 * @param expectedErrors - Object mapping field names to expected error messages
 * @returns Promise that resolves when all errors are verified
 */
export async function expectValidationErrors(expectedErrors: Record<string, string>) {
  for (const [field, message] of Object.entries(expectedErrors)) {
    const errorElement = await screen.findByTestId(`${field}-error`)
    expect(errorElement).toHaveTextContent(message)
  }
}

/**
 * Helper to verify form submission with expected data
 *
 * @param mockSubmitProject - The mock submit function
 * @param expectedData - Expected submission data
 * @returns Promise that resolves when submission is verified
 */
export async function expectFormSubmission(
  mockSubmitProject: jest.Mock,
  expectedData: Record<string, any>
) {
  const { waitFor } = await import('@testing-library/react')

  await waitFor(() => {
    expect(mockSubmitProject).toHaveBeenCalledWith(expect.objectContaining(expectedData))
  })
}

/**
 * Helper to verify accessibility attributes
 *
 * @param fieldId - The field test id
 * @param shouldBeInvalid - Whether field should be marked invalid
 * @returns Promise that resolves when attributes are verified
 */
export async function expectAccessibilityAttributes(fieldId: string, shouldBeInvalid = false) {
  const field = screen.getByTestId(fieldId)

  if (shouldBeInvalid) {
    expect(field).toHaveAttribute('aria-invalid', 'true')
  } else {
    expect(field).not.toHaveAttribute('aria-invalid', 'true')
  }
}

/**
 * Helper to verify keyboard navigation order
 *
 * @param user - User event instance
 * @param expectedOrder - Array of test ids in expected tab order
 * @returns Promise that resolves when navigation is verified
 */
export async function expectKeyboardNavigation(
  user: ReturnType<typeof userEvent.setup>,
  expectedOrder: string[]
) {
  for (const testId of expectedOrder) {
    await user.tab()
    expect(screen.getByTestId(testId)).toHaveFocus()
  }
}
