// Event categories for better organization
export const ANALYTICS_EVENTS = {
  // Load More & Pagination
  LOAD_MORE: 'Load More',
  LOAD_MORE_WEBSITES: 'Load More Websites',
  LOAD_MORE_MEMBERS: 'Load More Members',
  SHOW_ALL_WEBSITES: 'Show All Websites',
  SHOW_LESS_WEBSITES: 'Show Less Websites',

  // Search & Discovery
  SEARCH_SUBMIT: 'Search Submit',
  SEARCH_AUTOCOMPLETE_CLICK: 'Search Autocomplete Click',
  SEARCH_FILTER: 'Search Filter',
  SEARCH_CLEAR: 'Search Clear',

  // Navigation & Links
  WEBSITE_CLICK: 'Website Click',
  MEMBER_PROFILE_CLICK: 'Member Profile Click',
  CATEGORY_CLICK: 'Category Click',
  EXTERNAL_LINK_CLICK: 'External Link Click',
  GITHUB_LINK_CLICK: 'GitHub Link Click',

  // Sorting & Filtering
  SORT_CHANGE: 'Sort Change',
  SORT_BY_NAME: 'Sort By Name',
  SORT_BY_LATEST: 'Sort By Latest',

  // Content Interactions
  WEBSITE_VIEW: 'Website View',
  MEMBER_VIEW: 'Member View',
  GUIDE_CLICK: 'Guide Click',
  FEATURED_PROJECT_CLICK: 'Featured Project Click',
  CREATOR_PROJECT_CLICK: 'Creator Project Click',

  // Actions
  SUBMIT_WEBSITE: 'Submit Website',
  JOIN_COMMUNITY: 'Join Community',
  NEWSLETTER_SIGNUP: 'Newsletter Signup',

  // Form Events
  FORM_STEP_START: 'Form Step Start',
  FORM_STEP_COMPLETE: 'Form Step Complete',
  FORM_ERROR: 'Form Error',
  FORM_ABANDON: 'Form Abandon',
  FETCH_METADATA_SUCCESS: 'Fetch Metadata Success',
  FETCH_METADATA_ERROR: 'Fetch Metadata Error',
  SUBMIT_SUCCESS: 'Submit Success',
  SUBMIT_ERROR: 'Submit Error',

  // Trusted Submission Events
  SUBMISSION_PAGE_VIEW: 'Submission Page View',
  SUBMISSION_PREFLIGHT_START: 'Submission Preflight Start',
  SUBMISSION_PREFLIGHT_OUTCOME: 'Submission Preflight Outcome',
  SUBMISSION_SUPPORT_VIEW: 'Submission Support View',
  SUBMISSION_SUPPORT_PLATFORM_SELECT: 'Submission Support Platform Select',
  SUBMISSION_PROFILE_OPEN: 'Submission Profile Open',
  SUBMISSION_FOLLOW_ATTEST: 'Submission Follow Attest',
  SUBMISSION_SUPPORT_BACK: 'Submission Support Back',
  SUBMISSION_FINAL_START: 'Submission Final Start',
  SUBMISSION_FINAL_OUTCOME: 'Submission Final Outcome',
  SUBMISSION_PR_CREATED: 'Submission PR Created',
  SUBMISSION_PUBLISH_FAILURE: 'Submission Publish Failure',
  SUBMISSION_REQUEST_DURATION: 'Submission Request Duration',
  SUBMISSION_WEB_RISK_AVAILABLE: 'Submission Web Risk Available',
  SUBMISSION_WEB_RISK_UNAVAILABLE: 'Submission Web Risk Unavailable',

  // Profile Events
  PROFILE_MODAL_OPEN: 'Profile Modal Open',
  PROFILE_UPDATE_SUCCESS: 'Profile Update Success',
  PROFILE_UPDATE_ERROR: 'Profile Update Error',
  PROFILE_VISIBILITY_TOGGLE: 'Profile Visibility Toggle',
  ACCOUNT_DELETE_START: 'Account Delete Start',
  ACCOUNT_DELETE_SUCCESS: 'Account Delete Success',
  ACCOUNT_DELETE_CANCEL: 'Account Delete Cancel',

  // Tools & Resources
  TOOL_CLICK: 'Tool Click',
  RSS_DOWNLOAD: 'RSS Download',
  LLMS_TXT_VIEW: 'LLMS.txt View',

  // Error & Edge Cases
  SEARCH_NO_RESULTS: 'Search No Results',
  PAGE_ERROR: 'Page Error',
  LOAD_MORE_ERROR: 'Load More Error',

  // Settings Events
  SETTINGS_PAGE_VIEW: 'Settings Page View',
  SETTINGS_TAB_CLICK: 'Settings Tab Click',
  SETTINGS_EXPORT_DATA: 'Export Data',
  SETTINGS_TOGGLE_CHANGE: 'Settings Toggle Change',
  SETTINGS_CONNECT_GITHUB: 'Connect GitHub',
  SETTINGS_DISCONNECT_SERVICE: 'Disconnect Service',
  SETTINGS_SAVE: 'Settings Save',
  SETTINGS_DANGER_ZONE_TOGGLE: 'Danger Zone Toggle',

  // Navigation Events (Profile/Settings)
  PROFILE_NAV_CLICK: 'Profile Navigation Click',
  SETTINGS_NAV_CLICK: 'Settings Navigation Click',
  BACK_TO_PROFILE_CLICK: 'Back to Profile Click'
} as const

type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

interface EventProps {
  // Common props
  source?: string
  section?: string
  category?: string
  value?: number | string

  // Load More specific
  items_loaded?: number
  total_items?: number
  page?: number

  // Search specific
  query?: string
  results_count?: number
  filter_type?: string

  // Navigation specific
  destination?: string
  website_name?: string
  member_name?: string

  // Sort specific
  from_sort?: string
  to_sort?: string

  // Content specific
  content_type?: 'website' | 'member' | 'guide' | 'project' | 'tool'
  content_slug?: string

  // Privacy-safe trusted submission properties
  platform?: SubmissionAnalyticsPlatform
  decision?: SubmissionAnalyticsDecision
  reason_category?: SubmissionAnalyticsReasonCategory
  duration_bucket?: SubmissionAnalyticsDurationBucket
  pr_present?: boolean
  attempt_id?: string
}

/** Aggregate platform values permitted in trusted-submission analytics. */
export type SubmissionAnalyticsPlatform = 'x' | 'linkedin'

/** Aggregate lifecycle outcomes permitted in trusted-submission analytics. */
export type SubmissionAnalyticsDecision =
  | 'support_required'
  | 'automatic'
  | 'manual'
  | 'rejected'
  | 'retry_later'

/** Stable, non-identifying reason groups permitted in trusted-submission analytics. */
export type SubmissionAnalyticsReasonCategory =
  | 'passed'
  | 'duplicate'
  | 'rate_limit'
  | 'network_safety'
  | 'reputation_unavailable'
  | 'resource'
  | 'site_ownership'
  | 'editorial'
  | 'publication'
  | 'identity'
  | 'request_security'
  | 'continuation'
  | 'input'
  | 'unknown'

/** Coarse latency groups permitted in trusted-submission analytics. */
export type SubmissionAnalyticsDurationBucket = 'under_1s' | '1s_to_5s' | 'over_5s'

/** Fixed lifecycle sources permitted in trusted-submission analytics. */
export type SubmissionAnalyticsSource =
  | 'submit_page'
  | 'support_step'
  | 'preflight'
  | 'final_submission'

/**
 * Track an event with OpenPanel analytics
 */
export function trackEvent(event: AnalyticsEvent, props?: EventProps) {
  if (typeof window === 'undefined') return

  const cleanProps: Record<string, string | number> = {}
  if (props) {
    Object.entries(props).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanProps[key] = value
      }
    })
  }

  if (process.env.NODE_ENV === 'production') {
    try {
      window.op?.track(event, cleanProps)
    } catch (error) {
      console.warn('OpenPanel tracking failed:', error)
    }
  }
}

// Re-export convenience functions from helpers (split for file complexity limits)
export { analytics, submissionAnalytics } from './analytics-helpers'
