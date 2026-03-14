import { headers } from 'next/headers'
import React from 'react'
import { JsonLd } from '@/components/json-ld'

jest.mock('next/headers', () => ({
  headers: jest.fn()
}))

describe('JsonLd', () => {
  const mockedHeaders = headers as jest.MockedFunction<typeof headers>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('marks nonce-backed JSON-LD scripts to suppress hydration mismatches', async () => {
    mockedHeaders.mockResolvedValue(
      new Headers({ 'x-nonce': 'test-nonce' }) as Awaited<ReturnType<typeof headers>>
    )

    const scriptElement = await JsonLd({
      data: {
        '@context': 'https://schema.org',
        name: 'Example <script>alert(1)</script>'
      }
    })

    expect(React.isValidElement(scriptElement)).toBe(true)
    expect(scriptElement.props.nonce).toBe('test-nonce')
    expect(scriptElement.props.suppressHydrationWarning).toBe(true)
    expect(scriptElement.props.dangerouslySetInnerHTML.__html).toContain('\\u003cscript>')
  })
})
