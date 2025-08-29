/**
 * Form handlers for test components
 */

import React from 'react'

export interface FormData {
  url: string
  title: string
  description: string
  category: string
  tags: string[]
}

export interface FormErrors {
  [key: string]: string
}

/**
 * Create input change handler with error clearing
 *
 * @param fieldName - Name of the form field
 * @param formData - Current form data
 * @param setFormData - Function to update form data
 * @param errors - Current errors
 * @param setErrors - Function to update errors
 * @returns Input change handler function
 */
export function createInputChangeHandler(
  fieldName: keyof FormData,
  formData: FormData,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  errors: FormErrors,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value
    setFormData({ ...formData, [fieldName]: value })

    // Clear error when user starts typing
    if (value.trim() && errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }
}

/**
 * Create select change handler with error clearing
 *
 * @param fieldName - Name of the form field
 * @param formData - Current form data
 * @param setFormData - Function to update form data
 * @param errors - Current errors
 * @param setErrors - Function to update errors
 * @returns Select change handler function
 */
export function createSelectChangeHandler(
  fieldName: keyof FormData,
  formData: FormData,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  errors: FormErrors,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>
) {
  return (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData({ ...formData, [fieldName]: value })

    // Clear error when user selects something
    if (value && errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldName]
        return newErrors
      })
    }
  }
}

/**
 * Validates current form state
 *
 * @param formData - Current form data
 * @param setErrors - Function to update errors
 * @returns True if form is valid, false otherwise
 */
export function validateCurrentForm(
  formData: FormData,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>
): boolean {
  const newErrors: FormErrors = {}

  if (!formData.url.trim()) newErrors.url = 'URL is required'
  if (!formData.title.trim()) newErrors.title = 'Title is required'
  if (!formData.description.trim()) newErrors.description = 'Description is required'
  if (!formData.category.trim()) newErrors.category = 'Category is required'
  if (formData.tags.length === 0) newErrors.tags = 'At least one tag is required'

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

/**
 * Create URL blur handler with validation and metadata fetching
 *
 * @param formData - Current form data
 * @param setFormData - Function to update form data
 * @param errors - Current errors
 * @param setErrors - Function to update errors
 * @param setIsLoading - Function to update loading state
 * @returns URL blur handler function
 */
export function createUrlBlurHandler(
  formData: FormData,
  setFormData: React.Dispatch<React.SetStateAction<FormData>>,
  errors: FormErrors,
  setErrors: React.Dispatch<React.SetStateAction<FormErrors>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>
) {
  return async () => {
    if (!formData.url) return

    // Clear URL error when field has content
    if (formData.url.trim() && errors.url) {
      setErrors(prev => {
        const newErrors = { ...prev }
        newErrors.url = undefined
        return newErrors
      })
    }

    try {
      setIsLoading(true)
      const checkResult = await (global as any).mockCheckUrl(formData.url)

      if (checkResult.exists) {
        setErrors(prev => ({ ...prev, url: 'This URL already exists' }))
        return
      }

      const metadata = await (global as any).mockFetchMetadata(formData.url)
      setFormData(prev => ({
        ...prev,
        title: metadata.title || prev.title,
        description: metadata.description || prev.description,
        // Preserve existing form state including tags
        tags: prev.tags
      }))
    } catch (_error) {
      setErrors(prev => ({ ...prev, url: 'Failed to validate URL' }))
    } finally {
      setIsLoading(false)
    }
  }
}
