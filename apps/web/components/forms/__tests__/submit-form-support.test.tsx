import { recordSubmissionSupport } from '@/actions/record-submission-support'
import { SubmitFormSupport } from '@/components/forms/submit-form-support'
import { act, render, screen, userEvent, waitFor } from '@/test/test-utils'

jest.mock('@/actions/record-submission-support', () => ({ recordSubmissionSupport: jest.fn() }))

describe('SubmitFormSupport entry gate', () => {
  beforeEach(() => {
    jest
      .mocked(recordSubmissionSupport)
      .mockResolvedValue({ success: true, token: 'support-receipt' })
  })

  it('focuses the marketing heading and offers both exact profile links in new tabs', () => {
    render(<SubmitFormSupport onContinue={jest.fn()} />)
    expect(screen.getByRole('heading', { name: 'Follow or connect with David' })).toHaveFocus()
    expect(screen.getByRole('link', { name: /follow david on x/i })).toHaveAttribute(
      'href',
      'https://x.com/thedaviddias'
    )
    expect(screen.getByRole('link', { name: /follow or connect.*linkedin/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/thedaviddias/'
    )
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByText(/not verified|self-attestation/i)).not.toBeInTheDocument()
  })

  it.each([
    { label: /follow david on x/i, platform: 'x' },
    { label: /follow or connect.*linkedin/i, platform: 'linkedin' }
  ])('opens the form after a $platform receipt', async ({ label, platform }) => {
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<SubmitFormSupport onContinue={onContinue} />)
    expect(onContinue).not.toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: label }))
    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith({ platform, token: 'support-receipt' })
    )
    const data = jest.mocked(recordSubmissionSupport).mock.calls[0]?.[0]
    expect(data?.get('supportPlatform')).toBe(platform)
    expect(data?.has('followAttested')).toBe(false)
  })

  it('allows keyboard-only visitors to open the first profile and continue', async () => {
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<SubmitFormSupport onContinue={onContinue} />)
    await user.tab()
    expect(screen.getByRole('link', { name: /linkedin/i })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
  })

  it('prevents duplicate receipt requests and ignores completion after unmount', async () => {
    let complete: (result: { success: true; token: string }) => void = () => undefined
    const pending = new Promise<{ success: true; token: string }>(resolve => {
      complete = resolve
    })
    jest.mocked(recordSubmissionSupport).mockReturnValue(pending)
    const user = userEvent.setup()
    const onContinue = jest.fn()
    const view = render(<SubmitFormSupport onContinue={onContinue} />)
    await user.click(screen.getByRole('link', { name: /linkedin/i }))
    await user.click(screen.getByRole('link', { name: /follow david on x/i }))
    expect(recordSubmissionSupport).toHaveBeenCalledTimes(1)
    expect(onContinue).not.toHaveBeenCalled()
    view.unmount()
    await act(async () => {
      complete({ success: true, token: 'late-receipt' })
      await pending
    })
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('shows actionable errors without unlocking and allows another attempt', async () => {
    jest
      .mocked(recordSubmissionSupport)
      .mockResolvedValueOnce({ success: false, error: 'Refresh the page and try again.' })
    const user = userEvent.setup()
    const onContinue = jest.fn()
    render(<SubmitFormSupport onContinue={onContinue} />)
    await user.click(screen.getByRole('link', { name: /linkedin/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh the page and try again.')
    expect(onContinue).not.toHaveBeenCalled()
    await user.click(screen.getByRole('link', { name: /linkedin/i }))
    await waitFor(() => expect(onContinue).toHaveBeenCalledTimes(1))
  })

  it('keeps profile clicks out of automatic document-level tracking', async () => {
    const trackDocumentClick = jest.fn()
    document.addEventListener('click', trackDocumentClick)
    try {
      const user = userEvent.setup()
      render(<SubmitFormSupport onContinue={jest.fn()} />)
      await user.click(screen.getByRole('link', { name: /linkedin/i }))
      expect(trackDocumentClick).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener('click', trackDocumentClick)
    }
  })
})
