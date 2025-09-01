import { useCallback, useState } from 'react'

/**
 * Status of form submission
 */
export type FormStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Form state object returned by useFormState
 */
export interface FormState<T = unknown> {
  /**
   * Current form data
   */
  data: T
  /**
   * Current form status
   */
  status: FormStatus
  /**
   * Whether the form is currently submitting
   */
  isLoading: boolean
  /**
   * Whether the form has been successfully submitted
   */
  isSuccess: boolean
  /**
   * Whether there was an error during submission
   */
  isError: boolean
  /**
   * Error message if submission failed
   */
  error: string | null
  /**
   * Success data returned from submission
   */
  successData?: unknown
}

/**
 * Form actions returned by useFormState
 */
export interface FormActions<T = unknown> {
  /**
   * Update form data
   */
  setData: (data: T | ((prev: T) => T)) => void
  /**
   * Update a single field in form data
   */
  setField: <K extends keyof T>(field: K, value: T[K]) => void
  /**
   * Set error message
   */
  setError: (error: string | null) => void
  /**
   * Reset form to initial state
   */
  reset: () => void
  /**
   * Reset only status and error, keeping data
   */
  resetStatus: () => void
  /**
   * Submit the form with error handling
   */
  submit: (handler: (data: T) => Promise<unknown>) => Promise<unknown>
}

/**
 * Options for useFormState hook
 */
export interface UseFormStateOptions<T = unknown> {
  /**
   * Initial form data
   */
  initialData: T
  /**
   * Callback when form is successfully submitted
   */
  onSuccess?: (result: unknown) => void
  /**
   * Callback when form submission fails
   */
  onError?: (error: string) => void
  /**
   * Whether to reset form data after successful submission
   */
  resetOnSuccess?: boolean
  /**
   * Custom error message extractor
   */
  getErrorMessage?: (error: unknown) => string
}

/**
 * Hook for managing form state with loading, error, and success states
 *
 * @param options - Configuration options
 * @returns Form state and actions
 *
 * @example
 * ```tsx
 * const [state, actions] = useFormState({
 *   initialData: { email: '', name: '' },
 *   onSuccess: () => toast.success('Form submitted!'),
 *   resetOnSuccess: true
 * })
 *
 * const handleSubmit = () => {
 *   actions.submit(async (data) => {
 *     const response = await fetch('/api/submit', {
 *       method: 'POST',
 *       body: JSON.stringify(data)
 *     })
 *     if (!response.ok) throw new Error('Failed to submit')
 *     return response.json()
 *   })
 * }
 * ```
 */
export function useFormState<T = unknown>(
  options: UseFormStateOptions<T>
): [FormState<T>, FormActions<T>] {
  const {
    initialData,
    onSuccess,
    onError,
    resetOnSuccess = false,
    getErrorMessage = defaultGetErrorMessage
  } = options

  const [data, setData] = useState<T>(initialData)
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<unknown>()

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const isError = status === 'error'

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  const reset = useCallback(() => {
    setData(initialData)
    setStatus('idle')
    setError(null)
    setSuccessData(undefined)
  }, [initialData])

  const resetStatus = useCallback(() => {
    setStatus('idle')
    setError(null)
    setSuccessData(undefined)
  }, [])

  const submit = useCallback(
    async (handler: (data: T) => Promise<unknown>): Promise<unknown> => {
      setStatus('loading')
      setError(null)

      try {
        const result = await handler(data)
        setStatus('success')
        setSuccessData(result)

        if (resetOnSuccess) {
          setData(initialData)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const errorMessage = getErrorMessage(err)
        setStatus('error')
        setError(errorMessage)
        onError?.(errorMessage)
        throw err
      }
    },
    [data, initialData, resetOnSuccess, onSuccess, onError, getErrorMessage]
  )

  const state: FormState<T> = {
    data,
    status,
    isLoading,
    isSuccess,
    isError,
    error,
    successData
  }

  const actions: FormActions<T> = {
    setData,
    setField,
    setError,
    reset,
    resetStatus,
    submit
  }

  return [state, actions]
}

/**
 * Default error message extractor
 */
function defaultGetErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'An unexpected error occurred'
}

/**
 * Hook variant for simple forms without complex data
 *
 * @param onSubmit - Submit handler
 * @param options - Additional options
 * @returns Simplified form state and submit function
 *
 * @example
 * ```tsx
 * const { isLoading, error, submit } = useSimpleFormState(
 *   async () => {
 *     await api.deleteAccount()
 *   },
 *   { onSuccess: () => router.push('/goodbye') }
 * )
 * ```
 */
export function useSimpleFormState(
  onSubmit: () => Promise<unknown>,
  options?: Partial<Omit<UseFormStateOptions<void>, 'initialData'>>
) {
  const [state, actions] = useFormState({
    initialData: undefined as undefined,
    ...options
  })

  const submit = useCallback(() => actions.submit(onSubmit), [actions, onSubmit])

  return {
    status: state.status,
    isLoading: state.isLoading,
    isSuccess: state.isSuccess,
    isError: state.isError,
    error: state.error,
    successData: state.successData,
    submit,
    reset: actions.reset,
    resetStatus: actions.resetStatus,
    setError: actions.setError
  }
}
