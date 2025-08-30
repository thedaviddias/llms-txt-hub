interface FormData {
  firstName: string
  lastName: string
  username: string
  bio: string
  work: string
  website: string
  linkedin: string
}

interface ValidationResult {
  isValid: boolean
  error: string
}

/**
 * Validate profile form data
 * @param formData - Form data to validate
 * @param usernameError - Current username error state
 * @param isCheckingUsername - Whether username is being checked
 * @returns Validation result
 */
export function validateProfileForm(
  formData: FormData,
  usernameError: string,
  isCheckingUsername: boolean
): ValidationResult {
  // Check if username is still being validated
  if (isCheckingUsername) {
    return {
      isValid: false,
      error: 'Please wait while we check username availability'
    }
  }

  // Check if there's a username error
  if (usernameError) {
    return {
      isValid: false,
      error: 'Please fix the username error before submitting'
    }
  }

  // Client-side validation - only validate if fields have content
  if (formData.firstName.length > 50) {
    return {
      isValid: false,
      error: 'First name must be 50 characters or less'
    }
  }

  if (formData.lastName.length > 50) {
    return {
      isValid: false,
      error: 'Last name must be 50 characters or less'
    }
  }

  if (formData.username && formData.username.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters'
    }
  }

  if (formData.username.length > 30) {
    return {
      isValid: false,
      error: 'Username must be 30 characters or less'
    }
  }

  if (formData.bio.length > 160) {
    return {
      isValid: false,
      error: 'Bio must be 160 characters or less'
    }
  }

  if (formData.work.length > 100) {
    return {
      isValid: false,
      error: 'Work must be 100 characters or less'
    }
  }

  if (formData.website) {
    if (formData.website.length > 100) {
      return {
        isValid: false,
        error: 'Website URL must be 100 characters or less'
      }
    }
    try {
      new URL(formData.website)
    } catch {
      return {
        isValid: false,
        error: 'Please enter a valid website URL'
      }
    }
  }

  if (formData.linkedin) {
    if (formData.linkedin.length > 100) {
      return {
        isValid: false,
        error: 'LinkedIn URL must be 100 characters or less'
      }
    }
    // Validate LinkedIn URL format - must include linkedin.com/in/
    if (!formData.linkedin.includes('linkedin.com/in/')) {
      return {
        isValid: false,
        error: 'Please enter a valid LinkedIn profile URL (e.g., linkedin.com/in/yourname)'
      }
    }
    try {
      const urlToCheck = formData.linkedin.startsWith('http')
        ? formData.linkedin
        : `https://${formData.linkedin}`
      new URL(urlToCheck)
    } catch {
      return {
        isValid: false,
        error: 'Please enter a valid LinkedIn URL'
      }
    }
  }

  return { isValid: true, error: '' }
}
