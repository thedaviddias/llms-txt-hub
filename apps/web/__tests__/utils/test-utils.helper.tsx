/**
 * Simplified test utilities
 */

import { type RenderResult, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type CustomRenderOptions, createTestQueryClient, TestProviders } from './test-providers'

// Re-export mock factories
export {
  createMockApiError,
  createMockApiResponse,
  createMockProject,
  createMockUser
} from './mock-factories'
export { createTestQueryClient, TestProviders } from './test-providers'

/**
 * Custom render function with providers and user events
 *
 * @param ui - React component to render
 * @param options - Render options including custom providers
 * @returns Render result with user event utilities
 */
export function customRender(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const {
    user = null,
    isAuthenticated = false,
    theme = 'light',
    queryClient,
    wrapperProps = {},
    ...renderOptions
  } = options

  const testQueryClient = queryClient || createTestQueryClient()

  // Mock auth context values are provided directly to ThemeProvider

  /**
   * Wrapper component that provides all necessary contexts for testing
   *
   * @param props - Component props including children
   * @returns React component with all providers
   */
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders
        queryClient={testQueryClient}
        theme={theme}
        user={user}
        isAuthenticated={isAuthenticated}
        {...wrapperProps}
      >
        {children}
      </TestProviders>
    )
  }

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions })
  const userEventInstance = userEvent.setup()

  return {
    ...renderResult,
    user: userEventInstance
  }
}

// Re-export specific RTL helpers (excluding render to avoid duplicate export)
export {
  screen,
  fireEvent,
  waitFor,
  act,
  within,
  cleanup,
  getByRole,
  getByLabelText,
  getByPlaceholderText,
  getByText,
  getByDisplayValue,
  getByAltText,
  getByTitle,
  getByTestId,
  queryByRole,
  queryByLabelText,
  queryByPlaceholderText,
  queryByText,
  queryByDisplayValue,
  queryByAltText,
  queryByTitle,
  queryByTestId,
  findByRole,
  findByLabelText,
  findByPlaceholderText,
  findByText,
  findByDisplayValue,
  findByAltText,
  findByTitle,
  findByTestId,
  getAllByRole,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByText,
  getAllByDisplayValue,
  getAllByAltText,
  getAllByTitle,
  getAllByTestId,
  queryAllByRole,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByText,
  queryAllByDisplayValue,
  queryAllByAltText,
  queryAllByTitle,
  queryAllByTestId,
  findAllByRole,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByText,
  findAllByDisplayValue,
  findAllByAltText,
  findAllByTitle,
  findAllByTestId
} from '@testing-library/react'

export { default as userEvent } from '@testing-library/user-event'
export { customRender as render }
