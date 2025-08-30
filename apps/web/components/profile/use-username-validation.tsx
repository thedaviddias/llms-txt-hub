import { useCallback, useEffect, useState } from 'react'

interface UseUsernameValidationProps {
  username: string
  currentUsername?: string | null
}

/**
 * Custom hook for username availability checking
 * @param props - Hook configuration
 * @returns Username validation state and functions
 */
export function useUsernameValidation({ username, currentUsername }: UseUsernameValidationProps) {
  const [usernameError, setUsernameError] = useState('')
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)

  // Check username availability
  const checkUsernameAvailability = useCallback(
    async (usernameToCheck: string) => {
      if (!usernameToCheck || usernameToCheck.length < 3) {
        setUsernameError('')
        return
      }

      // Don't check if it's the same as current username
      if (usernameToCheck === currentUsername) {
        setUsernameError('')
        return
      }

      setIsCheckingUsername(true)
      setUsernameError('')

      try {
        const response = await fetch('/api/user/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameToCheck })
        })

        const data = await response.json()

        if (!response.ok) {
          setUsernameError(data.error || 'Error checking username')
          return
        }

        if (!data.available) {
          setUsernameError(data.error || 'Username is already taken')
        }
      } catch {
        setUsernameError('Error checking username availability')
      } finally {
        setIsCheckingUsername(false)
      }
    },
    [currentUsername]
  )

  // Debounce username checking
  useEffect(() => {
    if (!username) {
      setUsernameError('')
      return
    }

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username)
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [username, checkUsernameAvailability])

  return {
    usernameError,
    isCheckingUsername,
    setUsernameError
  }
}
