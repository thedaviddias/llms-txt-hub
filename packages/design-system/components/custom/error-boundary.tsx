import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'

interface Props {
  onError?: (error: Error, info: ErrorInfo) => void
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  readonly state: State = { hasError: false }

  // biome-ignore lint/complexity/noUselessConstructor: React component needs constructor for proper initialization
  constructor(props: Props) {
    super(props)
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }

    return this.props.children
  }
}
