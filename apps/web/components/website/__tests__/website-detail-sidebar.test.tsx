import { render, screen } from '@testing-library/react'
import { WebsiteDetailSidebar } from '@/components/website/website-detail-sidebar'
import type { WebsiteMetadata } from '@/lib/content-loader'

const mockHget = jest.fn()
const mockHgetall = jest.fn()

jest.mock('@/lib/redis', () => ({
  getRawClient: jest.fn(() => ({
    hget: mockHget,
    hgetall: mockHgetall
  }))
}))

const turboWebsite: WebsiteMetadata = {
  slug: 'turbo-llms-txt',
  name: 'Turbo',
  description: 'Incremental build system',
  website: 'https://turbo.build',
  llmsUrl: 'https://turbo.build/llms.txt',
  category: 'developer-tools',
  publishedAt: '2025-02-25'
}

describe('WebsiteDetailSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('separates install runs from the sum of agent placements', async () => {
    mockHget.mockResolvedValue(5)
    mockHgetall.mockResolvedValue({ cursor: 3, codex: 3, amp: 2 })

    render(await WebsiteDetailSidebar({ website: turboWebsite }))

    expect(mockHget).toHaveBeenCalledWith('telemetry:v2:skills:installs', 'turbo')
    expect(mockHgetall).toHaveBeenCalledWith('telemetry:v2:skills:agents:turbo')
    expect(screen.getByText('Install runs')).toBeInTheDocument()
    expect(screen.getByText('Agent placements')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('One run can install into multiple agents.')).toBeInTheDocument()
  })
})
