import { toast } from 'sonner'
import { SubmitForm } from '@/components/forms/submit-form'
import { fireEvent, render, screen, waitFor } from '@/test/test-utils'

jest.mock('@/actions/submit-llms-xxt', () => ({
  submitLlmsTxt: jest.fn()
}))

describe('SubmitForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the initial form', () => {
    render(<SubmitForm />)
    expect(screen.getByText('Submit your llms.txt')).toBeInTheDocument()
  })

  it('shows the metadata API error message when fetching website details fails', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Unable to fetch this website. Please check the URL and try again.'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    )

    render(<SubmitForm />)

    fireEvent.change(screen.getByLabelText(/website url/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.submit(screen.getByRole('button', { name: /get website details/i }).closest('form')!)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Unable to fetch this website. Please check the URL and try again.'
      )
    })
  })
})
