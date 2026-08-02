import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { SubmitForm } from '@/components/forms/submit-form'
import type { Step2Data } from '@/components/forms/submit-form-schemas'
import { useSubmitFormMetadata } from '@/components/forms/use-submit-form-metadata'
import { act, fireEvent, render, renderHook, screen, waitFor } from '@/test/test-utils'

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

describe('SubmitForm metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the initial form', () => {
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

  it('starts only one metadata request for rapid duplicate submissions', async () => {
    let resolveFetch: (response: Response) => void = () => undefined
    const responsePromise = new Promise<Response>(resolve => {
      resolveFetch = resolve
    })
    global.fetch = jest.fn(() => responsePromise)
    render(<SubmitForm />)
    fireEvent.change(screen.getByLabelText(/website url/i), {
      target: { value: 'https://example.com' }
    })
    const metadataForm = screen
      .getByRole('button', { name: /get website details/i })
      .closest('form')
    if (!metadataForm) throw new Error('Metadata form was not rendered')

    fireEvent.submit(metadataForm)
    fireEvent.submit(metadataForm)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })
    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ isDuplicate: false, metadata: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await responsePromise
    })
    expect(await screen.findByRole('button', { name: /continue to support/i })).toBeInTheDocument()
  })

  it('ignores a metadata response that resolves after unmount', async () => {
    let resolveFetch: (response: Response) => void = () => undefined
    const responsePromise = new Promise<Response>(resolve => {
      resolveFetch = resolve
    })
    global.fetch = jest.fn(() => responsePromise)
    const view = render(<SubmitForm />)
    fireEvent.change(screen.getByLabelText(/website url/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.submit(screen.getByRole('button', { name: /get website details/i }).closest('form')!)

    view.unmount()
    await act(async () => {
      resolveFetch(
        new Response(JSON.stringify({ isDuplicate: false, metadata: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      )
      await responsePromise
    })

    expect(toast.success).not.toHaveBeenCalled()
  })

  it('ignores an old metadata response after reset starts a newer generation', async () => {
    const onDetailsReady = jest.fn()
    const view = renderHook(() => {
      const form = useForm<Step2Data>()
      return useSubmitFormMetadata(form, onDetailsReady)
    })
    const resolvers: Array<(response: Response) => void> = []
    global.fetch = jest.fn(
      () =>
        new Promise<Response>(resolve => {
          resolvers.push(resolve)
        })
    )

    let oldRequest = Promise.resolve()
    act(() => {
      oldRequest = view.result.current.onFetchMetadata({ website: 'https://old.example' })
    })
    let newRequest = Promise.resolve()
    act(() => {
      view.result.current.reset()
      newRequest = view.result.current.onFetchMetadata({ website: 'https://new.example' })
    })
    expect(global.fetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      resolvers[1]?.(
        new Response(JSON.stringify({ isDuplicate: false, metadata: { name: 'New' } }), {
          status: 200
        })
      )
      await newRequest
    })
    expect(onDetailsReady).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvers[0]?.(
        new Response(JSON.stringify({ isDuplicate: false, metadata: { name: 'Old' } }), {
          status: 200
        })
      )
      await oldRequest
    })
    expect(onDetailsReady).toHaveBeenCalledTimes(1)
  })
})
