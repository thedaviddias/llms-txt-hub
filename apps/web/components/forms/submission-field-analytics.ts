'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { FieldNamesMarkedBoolean, UseFormReturn } from 'react-hook-form'
import type { SubmissionAnalyticsFieldName } from '@/lib/analytics'
import type { Step2Data } from './submit-form-schemas'

/** Normalized fields preserved between submission checks. */
export type PreparedSubmission = Step2Data & { readonly publishedAt: string }

/** Privacy-safe state recorded for one allowlisted submission field. */
export interface SubmissionFieldState {
  fieldName: SubmissionAnalyticsFieldName
  modified: boolean
  provided: boolean
  required: boolean
}

interface SubmissionFieldConfiguration {
  fieldName: SubmissionAnalyticsFieldName
  formField: keyof Step2Data
  required: boolean
}

interface SubmissionFieldTrackingAnalytics {
  resetSubmissionAttempt: () => void
  trackSubmissionFieldCompleted: (state: SubmissionFieldState) => void
  trackSubmissionFieldState: (state: SubmissionFieldState) => void
}

const SUBMISSION_FIELDS: readonly SubmissionFieldConfiguration[] = [
  { fieldName: 'website', formField: 'website', required: true },
  { fieldName: 'name', formField: 'name', required: true },
  { fieldName: 'description', formField: 'description', required: true },
  { fieldName: 'category', formField: 'category', required: true },
  { fieldName: 'llms_url', formField: 'llmsUrl', required: true },
  { fieldName: 'llms_full_url', formField: 'llmsFullUrl', required: false },
  { fieldName: 'additional_content', formField: 'mdxContent', required: false }
]

/** Return whether a field contains a non-empty string without retaining its value. */
const isProvided = (value: unknown) => typeof value === 'string' && value.trim().length > 0

/** Append the normalized submission snapshot to an action payload. */
export function appendSubmissionFields(formData: FormData, values: PreparedSubmission) {
  for (const [key, value] of Object.entries(values)) {
    if (value) formData.append(key, value)
  }
}

/**
 * Convert one changed form field into a privacy-safe state when it is allowlisted.
 */
export function submissionFieldState(
  formField: string,
  value: unknown,
  modified: boolean
): SubmissionFieldState | undefined {
  const field = SUBMISSION_FIELDS.find(candidate => candidate.formField === formField)
  if (!field) return
  return {
    fieldName: field.fieldName,
    modified,
    provided: isProvided(value),
    required: field.required
  }
}

/**
 * Convert submitted form values into aggregate field states without retaining their contents.
 */
export function submissionFieldStates(
  values: Step2Data,
  dirtyFields: Partial<Readonly<FieldNamesMarkedBoolean<Step2Data>>>
): readonly SubmissionFieldState[] {
  return SUBMISSION_FIELDS.flatMap(field => {
    const state = submissionFieldState(
      field.formField,
      values[field.formField],
      dirtyFields[field.formField] === true
    )
    return state ? [state] : []
  })
}

/**
 * Track first field completion and the final privacy-safe field snapshot for an attempt.
 */
export function useSubmissionFieldTracking(
  form: UseFormReturn<Step2Data>,
  enabled: boolean,
  analytics: SubmissionFieldTrackingAnalytics
) {
  const completedFields = useRef(new Set<SubmissionFieldState['fieldName']>())
  const analyticsRef = useRef(analytics)
  analyticsRef.current = analytics

  useEffect(() => {
    if (!enabled) return
    const subscription = form.watch((values, { name, type }) => {
      if (!(name && type === 'change')) return
      const state = submissionFieldState(name, values[name], true)
      if (!(state?.provided && !completedFields.current.has(state.fieldName))) return
      completedFields.current.add(state.fieldName)
      analyticsRef.current.trackSubmissionFieldCompleted(state)
    })
    return () => subscription.unsubscribe()
  }, [enabled, form])

  const capture = useCallback(
    (values: Step2Data) => {
      for (const state of submissionFieldStates(values, form.formState.dirtyFields)) {
        analyticsRef.current.trackSubmissionFieldState(state)
      }
    },
    [form]
  )

  const reset = useCallback(() => {
    completedFields.current.clear()
    analyticsRef.current.resetSubmissionAttempt()
  }, [])

  return { capture, reset }
}
