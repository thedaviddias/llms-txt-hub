/**
 * Reusable test components for integration tests
 *
 * These components are extracted from large test files to reduce complexity
 * and improve reusability across test suites.
 */

import React, { useId } from 'react'
import {
  createInputChangeHandler,
  createSelectChangeHandler,
  createUrlBlurHandler,
  type FormData,
  type FormErrors,
  validateCurrentForm
} from './form-handlers'

// Get mocks from global scope (set up in individual tests)
// Note: Mocks are available on globalThis (mockCheckUrl, mockFetchMetadata, mockSubmitProject)

/**
 * Simplified submit form component for testing project submission flow
 *
 * @param props - Component properties
 * @returns JSX component for testing form interactions
 */
export const TestSubmitProjectForm = () => {
  const urlErrorId = useId()
  const titleErrorId = useId()
  const descriptionErrorId = useId()
  const categoryErrorId = useId()
  const tagsErrorId = useId()

  const [formData, setFormData] = React.useState<FormData>({
    url: '',
    title: '',
    description: '',
    category: '',
    tags: []
  })
  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSuccess, setIsSuccess] = React.useState(false)
  const [submitCount, setSubmitCount] = React.useState(0)

  const handleUrlBlur = createUrlBlurHandler(formData, setFormData, errors, setErrors, setIsLoading)

  /**
   * Handles form submission with validation and API call
   *
   * @param e - Form submission event
   * @returns Promise that resolves when submission is complete
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitCount(prev => prev + 1)

    const isValid = validateCurrentForm(formData, setErrors)

    if (!isValid) {
      return
    }

    try {
      setIsLoading(true)
      await (globalThis as any).mockSubmitProject(formData)
      setIsSuccess(true)
    } catch (_error) {
      setErrors(prev => ({ ...prev, submit: 'Failed to submit project' }))
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handles button click event for form submission
   *
   * @param e - Mouse click event
   * @returns Promise that resolves when submission is complete
   */
  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setSubmitCount(prev => prev + 1)

    const isValid = validateCurrentForm(formData, setErrors)

    if (!isValid) {
      return
    }

    try {
      setIsLoading(true)
      ;(globalThis as any)
        .mockSubmitProject(formData)
        .then(() => setIsSuccess(true))
        .catch(() => setErrors(prev => ({ ...prev, submit: 'Failed to submit project' })))
        .finally(() => setIsLoading(false))
    } catch (_error) {
      setErrors(prev => ({ ...prev, submit: 'Failed to submit project' }))
    }
  }

  if (isSuccess) {
    return (
      <div data-testid="success-message">
        <h2>Project submitted successfully!</h2>
        <p>Your project has been added to the hub.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} data-testid="submit-form">
      {/* Debug info */}
      <div data-testid="debug-info" style={{ display: 'none' }}>
        Submit count: {submitCount}, Errors: {JSON.stringify(errors)}
      </div>
      <div>
        <label>
          Project URL *
          <input
            name="url"
            type="url"
            value={formData.url}
            onChange={createInputChangeHandler('url', formData, setFormData, errors, setErrors)}
            onBlur={handleUrlBlur}
            data-testid="url-input"
            aria-invalid={errors.url ? 'true' : 'false'}
            aria-describedby={errors.url ? urlErrorId : undefined}
          />
        </label>
        {errors.url && (
          <span id={urlErrorId} data-testid="url-error" role="alert">
            {errors.url}
          </span>
        )}
      </div>

      <div>
        <label>
          Title *
          <input
            name="title"
            type="text"
            value={formData.title}
            onChange={createInputChangeHandler('title', formData, setFormData, errors, setErrors)}
            data-testid="title-input"
            aria-invalid={errors.title ? 'true' : 'false'}
            aria-describedby={errors.title ? titleErrorId : undefined}
          />
        </label>
        {errors.title && (
          <span id={titleErrorId} data-testid="title-error" role="alert">
            {errors.title}
          </span>
        )}
      </div>

      <div>
        <label>
          Description *
          <textarea
            name="description"
            value={formData.description}
            onChange={createInputChangeHandler(
              'description',
              formData,
              setFormData,
              errors,
              setErrors
            )}
            data-testid="description-input"
            aria-invalid={errors.description ? 'true' : 'false'}
            aria-describedby={errors.description ? descriptionErrorId : undefined}
          />
        </label>
        {errors.description && (
          <span id={descriptionErrorId} data-testid="description-error" role="alert">
            {errors.description}
          </span>
        )}
      </div>

      <div>
        <label>
          Category *
          <select
            name="category"
            value={formData.category}
            onChange={createSelectChangeHandler(
              'category',
              formData,
              setFormData,
              errors,
              setErrors
            )}
            data-testid="category-select"
            aria-invalid={errors.category ? 'true' : 'false'}
            aria-describedby={errors.category ? categoryErrorId : undefined}
          >
            <option value="">Select a category</option>
            <option value="AI Tools">AI Tools</option>
            <option value="Development">Development</option>
            <option value="Productivity">Productivity</option>
          </select>
        </label>
        {errors.category && (
          <span id={categoryErrorId} data-testid="category-error" role="alert">
            {errors.category}
          </span>
        )}
      </div>

      <div>
        <fieldset>
          <legend>Tags *</legend>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.tags.includes('ai')}
                onChange={e => {
                  const newTags = e.target.checked
                    ? [...formData.tags, 'ai']
                    : formData.tags.filter(tag => tag !== 'ai')
                  setFormData({ ...formData, tags: newTags })
                  if (newTags.length > 0) {
                    setErrors(prev => {
                      const { tags, ...newErrors } = prev
                      return newErrors
                    })
                  }
                }}
                data-testid="tag-ai"
              />
              AI
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.tags.includes('development')}
                onChange={e => {
                  const newTags = e.target.checked
                    ? [...formData.tags, 'development']
                    : formData.tags.filter(tag => tag !== 'development')
                  setFormData({ ...formData, tags: newTags })
                  if (newTags.length > 0) {
                    setErrors(prev => {
                      const { tags, ...newErrors } = prev
                      return newErrors
                    })
                  }
                }}
                data-testid="tag-development"
              />
              Development
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={formData.tags.includes('productivity')}
                onChange={e => {
                  const newTags = e.target.checked
                    ? [...formData.tags, 'productivity']
                    : formData.tags.filter(tag => tag !== 'productivity')
                  setFormData({ ...formData, tags: newTags })
                  if (newTags.length > 0) {
                    setErrors(prev => {
                      const { tags, ...newErrors } = prev
                      return newErrors
                    })
                  }
                }}
                data-testid="tag-productivity"
              />
              Productivity
            </label>
          </div>
        </fieldset>
        {errors.tags && (
          <span id={tagsErrorId} data-testid="tags-error" role="alert">
            {errors.tags}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={isLoading}
        data-testid="submit-button"
        onClick={handleButtonClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleButtonClick(e as any)
          }
        }}
      >
        {isLoading ? 'Submitting...' : 'Submit Project'}
      </button>

      {errors.submit && (
        <div data-testid="submit-error" role="alert">
          {errors.submit}
        </div>
      )}
    </form>
  )
}
