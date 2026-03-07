import { fireEvent, render, screen, waitFor } from '@/__tests__/utils/test-utils.helper'
import {
  UNINSTALL_REASONS,
  UninstallFeedbackForm
} from '@/app/extension/uninstall/uninstall-feedback-form'

describe('UninstallFeedbackForm', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  it('renders all uninstall reason options', () => {
    render(<UninstallFeedbackForm version="2.0.0" lang="en-US" />)

    for (const reason of UNINSTALL_REASONS) {
      expect(screen.getByLabelText(reason)).toBeInTheDocument()
    }
  })

  it('requires a reason before submission', async () => {
    render(<UninstallFeedbackForm version="2.0.0" lang="en-US" />)

    const form = screen.getByRole('button', { name: 'Submit feedback' }).closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('Please choose a reason before submitting.')).toBeInTheDocument()
    })
  })

  it('enforces comment max length guard', async () => {
    render(<UninstallFeedbackForm version="2.0.0" lang="en-US" />)

    const otherOption = screen.getByRole('radio', { name: 'Other' })
    fireEvent.click(otherOption)
    expect(otherOption).toBeChecked()

    const textarea = screen.getByLabelText('Additional comments (optional)')
    const oversizedComment = 'a'.repeat(1001)

    fireEvent.change(textarea, { target: { value: oversizedComment } })

    const form = screen.getByRole('button', { name: 'Submit feedback' }).closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('Comments must be 1000 characters or fewer.')).toBeInTheDocument()
    })
  })

  it('submits expected payload directly to extension feedback API', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true })
    })

    global.fetch = fetchMock as typeof global.fetch

    const { user } = render(<UninstallFeedbackForm version="2.0.0" lang="en-US" />)

    const noisyOption = screen.getByRole('radio', { name: 'Too noisy or distracting' })
    fireEvent.click(noisyOption)
    expect(noisyOption).toBeChecked()
    await user.type(
      screen.getByLabelText('Additional comments (optional)'),
      'Popup felt too chatty on local projects.'
    )

    const form = screen.getByRole('button', { name: 'Submit feedback' }).closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/extension-feedback',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )

    const firstCall = fetchMock.mock.calls[0]
    const payload = JSON.parse(firstCall[1]?.body as string)

    expect(payload.event).toBe('uninstall')
    expect(payload.reason).toBe('Too noisy or distracting')
    expect(payload.comment).toBe('Popup felt too chatty on local projects.')
    expect(payload.version).toBe('2.0.0')
    expect(payload.lang).toBe('en-US')
    expect(typeof payload.submittedAt).toBe('string')

    await waitFor(() => {
      expect(screen.getByText('Thanks for the feedback')).toBeInTheDocument()
    })
  })

  it('shows an error state when API submission fails', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Rate limit exceeded. Please try again later.' })
    })

    global.fetch = fetchMock as typeof global.fetch

    render(<UninstallFeedbackForm version="2.0.0" lang="en-US" />)

    const missingFeaturesOption = screen.getByRole('radio', { name: 'Missing key features' })
    fireEvent.click(missingFeaturesOption)
    expect(missingFeaturesOption).toBeChecked()
    const form = screen.getByRole('button', { name: 'Submit feedback' }).closest('form')
    expect(form).not.toBeNull()
    fireEvent.submit(form as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded. Please try again later.')).toBeInTheDocument()
    })
  })
})
