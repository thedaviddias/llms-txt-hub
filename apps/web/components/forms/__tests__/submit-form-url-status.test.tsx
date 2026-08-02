import { act, fireEvent, screen, waitFor } from '@/test/test-utils'
import { reachSubmissionDetails, SUBMISSION_METADATA } from './submit-form-test-helpers'

jest.mock('@/actions/preflight-submission', () => ({ preflightSubmission: jest.fn() }))
jest.mock('@/actions/submit-llms-xxt', () => ({ submitLlmsTxt: jest.fn() }))

/** Advance the URL-check debounce after changing an input. */
async function changeCheckedUrl(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } })
  await act(async () => {
    jest.advanceTimersByTime(100)
  })
}

describe('SubmitForm URL status generations', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows checking, success, and error states for the current URL', async () => {
    await reachSubmissionDetails()
    jest.useFakeTimers()
    const llmsUrl = screen.getByPlaceholderText('https://example.com/llms.txt')
    let resolveCheck: (response: Response) => void = () => undefined
    let checkPromise = new Promise<Response>(resolve => {
      resolveCheck = resolve
    })
    global.fetch = jest.fn(() => checkPromise)

    await changeCheckedUrl(llmsUrl, 'https://example.com/first/llms.txt')
    expect(screen.getByLabelText('Checking llms.txt URL')).toBeInTheDocument()
    await act(async () => {
      resolveCheck(new Response(JSON.stringify({ accessible: true }), { status: 200 }))
      await checkPromise
    })
    expect(await screen.findByTitle('URL is accessible')).toBeInTheDocument()

    checkPromise = new Promise<Response>(resolve => {
      resolveCheck = resolve
    })
    await changeCheckedUrl(llmsUrl, 'https://example.com/second/llms.txt')
    await act(async () => {
      resolveCheck(
        new Response(JSON.stringify({ accessible: false, error: 'Not found' }), { status: 200 })
      )
      await checkPromise
    })
    expect(await screen.findByTitle('Not found')).toBeInTheDocument()
  })

  it('ignores an older URL result after a newer check finishes', async () => {
    await reachSubmissionDetails()
    jest.useFakeTimers()
    const resolvers: Array<(response: Response) => void> = []
    global.fetch = jest.fn(
      () =>
        new Promise<Response>(resolve => {
          resolvers.push(resolve)
        })
    )
    const llmsUrl = screen.getByPlaceholderText('https://example.com/llms.txt')

    await changeCheckedUrl(llmsUrl, 'https://example.com/old/llms.txt')
    await changeCheckedUrl(llmsUrl, 'https://example.com/new/llms.txt')
    await act(async () => {
      resolvers[1]?.(new Response(JSON.stringify({ accessible: true }), { status: 200 }))
    })
    expect(await screen.findByTitle('URL is accessible')).toBeInTheDocument()

    await act(async () => {
      resolvers[0]?.(
        new Response(JSON.stringify({ accessible: false, error: 'Stale failure' }), { status: 200 })
      )
    })
    expect(screen.getByTitle('URL is accessible')).toBeInTheDocument()
    expect(screen.queryByTitle('Stale failure')).not.toBeInTheDocument()
  })

  it('clears both URL statuses when the form resets', async () => {
    await reachSubmissionDetails()
    jest.useFakeTimers()
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessible: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    await changeCheckedUrl(
      screen.getByPlaceholderText('https://example.com/llms.txt'),
      'https://example.com/current/llms.txt'
    )
    await changeCheckedUrl(
      screen.getByPlaceholderText('https://example.com/llms-full.txt'),
      'https://example.com/current/llms-full.txt'
    )
    expect(await screen.findAllByTitle('URL is accessible')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    jest.useRealTimers()
    global.fetch = jest.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ isDuplicate: false, metadata: SUBMISSION_METADATA }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    fireEvent.change(screen.getByLabelText(/website url/i), {
      target: { value: 'https://example.com' }
    })
    fireEvent.submit(screen.getByRole('button', { name: /get website details/i }).closest('form')!)
    await screen.findByRole('button', { name: /continue to support/i })

    await waitFor(() => {
      expect(screen.queryByTitle('URL is accessible')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Not found')).not.toBeInTheDocument()
    })
  })
})
