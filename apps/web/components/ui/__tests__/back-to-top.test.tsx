import { BackToTop } from '@/components/ui/back-to-top'
import { fireEvent, render, screen } from '@testing-library/react'

// Mock window.scrollTo
const mockScrollTo = jest.fn()
Object.defineProperty(window, 'scrollTo', {
  value: mockScrollTo,
  writable: true
})

/**
 * Helper to trigger scroll events and mock document/window properties
 * @param scrollY - Current scroll position
 * @param pageHeight - Total page height
 * @param viewportHeight - Viewport height
 */
const mockScrollEvent = (scrollY: number, pageHeight: number, viewportHeight: number) => {
  Object.defineProperty(window, 'scrollY', { value: scrollY, configurable: true })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: pageHeight,
    configurable: true
  })
  Object.defineProperty(window, 'innerHeight', { value: viewportHeight, configurable: true })

  fireEvent.scroll(window)
}

describe('BackToTop', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset scroll position
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('should not render when page is short', () => {
    render(<BackToTop />)

    // Simulate short page (not 1.5x viewport height)
    mockScrollEvent(500, 800, 800)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should not render when user has not scrolled enough', () => {
    render(<BackToTop />)

    // Simulate long page but low scroll position
    mockScrollEvent(200, 2000, 800)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should render when page is long and user has scrolled past threshold', () => {
    render(<BackToTop />)

    // Simulate long page and sufficient scroll
    mockScrollEvent(500, 2000, 800)

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByLabelText('Back to top')).toBeInTheDocument()
  })

  it('should scroll to top when clicked', () => {
    render(<BackToTop />)

    // Make button visible
    mockScrollEvent(500, 2000, 800)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(mockScrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth'
    })
  })

  it('should hide when scrolling back up', () => {
    render(<BackToTop />)

    // Make button visible
    mockScrollEvent(500, 2000, 800)
    expect(screen.getByRole('button')).toBeInTheDocument()

    // Scroll back up
    mockScrollEvent(200, 2000, 800)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should have correct accessibility attributes', () => {
    render(<BackToTop />)

    // Make button visible
    mockScrollEvent(500, 2000, 800)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-label', 'Back to top')
  })
})
