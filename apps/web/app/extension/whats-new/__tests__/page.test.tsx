import type { ImgHTMLAttributes, ReactElement } from 'react'
import { render, screen } from '@/__tests__/utils/test-utils.helper'
import ExtensionWhatsNewPage from '@/app/extension/whats-new/page'
import { getExtensionUpdateByVersion, getLatestExtensionUpdate } from '@/lib/extension-updates'

jest.mock('@/lib/seo/seo-config', () => ({
  generateBaseMetadata: jest.fn(() => ({
    title: "What's New | LLMs.txt Checker"
  }))
}))

let capturedMdxComponents: Record<string, unknown> | undefined

jest.mock('next-mdx-remote/rsc', () => ({
  MDXRemote: ({ source, components }: { source: string; components?: Record<string, unknown> }) => {
    capturedMdxComponents = components
    return <div data-testid="mdx-content">{source}</div>
  }
}))

jest.mock('@/lib/extension-updates', () => ({
  getExtensionUpdateByVersion: jest.fn(),
  getLatestExtensionUpdate: jest.fn()
}))

const mockedGetExtensionUpdateByVersion = getExtensionUpdateByVersion as jest.MockedFunction<
  typeof getExtensionUpdateByVersion
>
const mockedGetLatestExtensionUpdate = getLatestExtensionUpdate as jest.MockedFunction<
  typeof getLatestExtensionUpdate
>

const release200 = {
  slug: '2-0-0',
  version: '2.0.0',
  title: 'LLMs.txt Checker v2.0.0',
  description: 'A quieter, clearer extension with better lifecycle and trust controls.',
  date: '2026-03-03',
  published: true,
  highlights: [
    'Per-site pause controls with explicit host:port rules.',
    'Localhost is now opt-in by default.',
    'Popup and status UX were redesigned.',
    "Lifecycle updates include automatic What's New opening.",
    'Privacy and trust upgrades include uninstall feedback hooks.'
  ],
  content: 'Narrative release notes for v2.0.0'
}

const latestRelease = {
  ...release200,
  slug: '2-1-0',
  version: '2.1.0',
  title: 'LLMs.txt Checker v2.1.0',
  content: 'Narrative release notes for v2.1.0'
}

describe('/extension/whats-new page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedMdxComponents = undefined
  })

  it('renders the requested known version when v is provided', async () => {
    mockedGetExtensionUpdateByVersion.mockReturnValue(release200)
    mockedGetLatestExtensionUpdate.mockReturnValue(latestRelease)

    const page = await ExtensionWhatsNewPage({
      searchParams: Promise.resolve({ v: '2.0.0', pv: '1.0.0', lang: 'en-US', src: 'extension' })
    })

    render(page)

    expect(screen.getByText('LLMs.txt Checker v2.0.0')).toBeInTheDocument()
    expect(screen.getByText('Updated from 1.0.0')).toBeInTheDocument()
    expect(screen.getByTestId('mdx-content')).toHaveTextContent(
      'Narrative release notes for v2.0.0'
    )
    expect(mockedGetExtensionUpdateByVersion).toHaveBeenCalledWith('2.0.0')
  })

  it('falls back to the latest release when requested version is unknown', async () => {
    mockedGetExtensionUpdateByVersion.mockReturnValue(null)
    mockedGetLatestExtensionUpdate.mockReturnValue(latestRelease)

    const page = await ExtensionWhatsNewPage({
      searchParams: Promise.resolve({ v: '9.9.9', pv: '2.0.0' })
    })

    render(page)

    expect(screen.getByText('LLMs.txt Checker v2.1.0')).toBeInTheDocument()
    expect(screen.getByTestId('mdx-content')).toHaveTextContent(
      'Narrative release notes for v2.1.0'
    )
    expect(mockedGetLatestExtensionUpdate).toHaveBeenCalled()
  })

  it('falls back to latest release when v is missing', async () => {
    mockedGetExtensionUpdateByVersion.mockReturnValue(null)
    mockedGetLatestExtensionUpdate.mockReturnValue(latestRelease)

    const page = await ExtensionWhatsNewPage({
      searchParams: Promise.resolve({ pv: '2.0.0' })
    })

    render(page)

    expect(screen.getByText('LLMs.txt Checker v2.1.0')).toBeInTheDocument()
    expect(mockedGetExtensionUpdateByVersion).not.toHaveBeenCalled()
    expect(mockedGetLatestExtensionUpdate).toHaveBeenCalledTimes(1)
  })

  it('shows previous-version context only when pv differs from current release', async () => {
    mockedGetExtensionUpdateByVersion.mockReturnValue(release200)
    mockedGetLatestExtensionUpdate.mockReturnValue(latestRelease)

    const page = await ExtensionWhatsNewPage({
      searchParams: Promise.resolve({ v: '2.0.0', pv: 'v2.0.0' })
    })

    render(page)

    expect(screen.queryByText(/Updated from/)).not.toBeInTheDocument()
  })

  it('provides an MDX image renderer with optional caption support', async () => {
    mockedGetExtensionUpdateByVersion.mockReturnValue(release200)
    mockedGetLatestExtensionUpdate.mockReturnValue(latestRelease)

    const page = await ExtensionWhatsNewPage({
      searchParams: Promise.resolve({ v: '2.0.0' })
    })

    render(page)

    const imageRenderer = capturedMdxComponents?.img as
      | ((props: ImgHTMLAttributes<HTMLImageElement>) => ReactElement)
      | undefined

    expect(typeof imageRenderer).toBe('function')

    if (!imageRenderer) {
      throw new Error('Expected MDX image renderer to be defined')
    }

    render(
      imageRenderer({
        src: '/extension-updates/screenshots/new-popup-v2.png',
        alt: 'New popup screenshot',
        title: 'New popup interface in v2.0.0'
      })
    )

    expect(screen.getByAltText('New popup screenshot')).toBeInTheDocument()
    expect(screen.getByText('New popup interface in v2.0.0')).toBeInTheDocument()
  })
})
