// Plausible Analytics Event Tracking
// This works on both server and client, with client-only execution

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void
  }
}

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
}

/**
 * Track an event with Plausible Analytics
 */
export function trackEvent(event: AnalyticsEvent, props?: EventProps) {
  if (typeof window !== 'undefined' && window.plausible) {
    try {
      // Filter out undefined values and ensure types match Plausible expectations
      const cleanProps: Record<string, string | number> = {}
      if (props) {
        Object.entries(props).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanProps[key] = value
          }
        })
      }
      window.plausible(event, { props: cleanProps })
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }
}

/**
 * Track page view (usually automatic, but can be used for SPA navigation)
 */
export function trackPageView(url?: string) {
  if (typeof window !== 'undefined' && window.plausible) {
    try {
      if (url) {
        window.plausible('pageview', { props: { url } })
      } else {
        window.plausible('pageview')
      }
    } catch (error) {
      console.warn('Page view tracking failed:', error)
    }
  }
}

// Convenience functions for common events
export const analytics = {
  // Load More Events
  loadMore: (
    type: 'websites' | 'members',
    itemsLoaded: number,
    totalItems: number,
    source?: string
  ) => {
    trackEvent(ANALYTICS_EVENTS.LOAD_MORE, {
      source,
      content_type: type === 'websites' ? 'website' : 'member',
      items_loaded: itemsLoaded,
      total_items: totalItems
    })
  },

  showAll: (type: 'websites' | 'members', totalItems: number, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SHOW_ALL_WEBSITES, {
      source,
      content_type: type === 'websites' ? 'website' : 'member',
      total_items: totalItems
    })
  },

  showLess: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SHOW_LESS_WEBSITES, { source })
  },

  // Search Events
  search: (query: string, resultsCount: number, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SEARCH_SUBMIT, {
      query: query.toLowerCase().trim(),
      results_count: resultsCount,
      source
    })
  },

  searchAutocomplete: (query: string, suggestion: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SEARCH_AUTOCOMPLETE_CLICK, {
      query: query.toLowerCase().trim(),
      value: suggestion,
      source
    })
  },

  searchNoResults: (query: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SEARCH_NO_RESULTS, {
      query: query.toLowerCase().trim(),
      source
    })
  },

  // Navigation Events
  websiteClick: (websiteName: string, websiteSlug: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.WEBSITE_CLICK, {
      website_name: websiteName,
      content_slug: websiteSlug,
      source
    })
  },

  memberClick: (memberName: string, memberSlug: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.MEMBER_PROFILE_CLICK, {
      member_name: memberName,
      content_slug: memberSlug,
      source
    })
  },

  categoryClick: (categoryName: string, categorySlug: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.CATEGORY_CLICK, {
      category: categoryName,
      destination: `/category/${categorySlug}`,
      source
    })
  },

  externalLink: (url: string, linkText: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.EXTERNAL_LINK_CLICK, {
      destination: url,
      value: linkText,
      source
    })
  },

  githubLink: (username: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.GITHUB_LINK_CLICK, {
      destination: `https://github.com/${username}`,
      value: username,
      source
    })
  },

  // Sort Events
  sortChange: (fromSort: string, toSort: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SORT_CHANGE, {
      from_sort: fromSort,
      to_sort: toSort,
      source
    })
  },

  // Action Events
  submitWebsite: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SUBMIT_WEBSITE, { source })
  },

  joinCommunity: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.JOIN_COMMUNITY, { source })
  },

  newsletterSignup: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.NEWSLETTER_SIGNUP, { source })
  },

  // Tool Events
  toolClick: (toolName: string, toolUrl: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.TOOL_CLICK, {
      value: toolName,
      destination: toolUrl,
      source
    })
  },

  // Creator Project Events
  creatorProjectClick: (
    projectName: string,
    url: string,
    action: 'visit-site' | 'github',
    source?: string
  ) => {
    trackEvent(ANALYTICS_EVENTS.CREATOR_PROJECT_CLICK, {
      value: projectName,
      destination: url,
      category: action,
      source
    })
  },

  // Form Events
  formStepStart: (step: number, formName: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.FORM_STEP_START, {
      value: step,
      category: formName,
      source
    })
  },

  formStepComplete: (step: number, formName: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.FORM_STEP_COMPLETE, {
      value: step,
      category: formName,
      source
    })
  },

  formError: (step: number, errorMessage: string, formName: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.FORM_ERROR, {
      value: step,
      category: formName,
      section: errorMessage,
      source
    })
  },

  fetchMetadataSuccess: (website: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.FETCH_METADATA_SUCCESS, {
      value: website,
      source
    })
  },

  fetchMetadataError: (website: string, errorMessage: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.FETCH_METADATA_ERROR, {
      value: website,
      section: errorMessage,
      source
    })
  },

  submitSuccess: (website: string, category: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SUBMIT_SUCCESS, {
      value: website,
      category,
      source
    })
  },

  submitError: (website: string, errorMessage: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SUBMIT_ERROR, {
      value: website,
      section: errorMessage,
      source
    })
  },

  // Profile Events
  profileModalOpen: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.PROFILE_MODAL_OPEN, { source })
  },

  profileUpdateSuccess: (isPublic: boolean, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.PROFILE_UPDATE_SUCCESS, {
      value: isPublic ? 'public' : 'private',
      source
    })
  },

  profileUpdateError: (errorMessage: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.PROFILE_UPDATE_ERROR, {
      section: errorMessage,
      source
    })
  },

  profileVisibilityToggle: (isPublic: boolean, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.PROFILE_VISIBILITY_TOGGLE, {
      value: isPublic ? 'public' : 'private',
      source
    })
  },

  accountDeleteStart: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.ACCOUNT_DELETE_START, { source })
  },

  accountDeleteSuccess: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.ACCOUNT_DELETE_SUCCESS, { source })
  },

  accountDeleteCancel: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.ACCOUNT_DELETE_CANCEL, { source })
  },

  // Settings Events
  settingsPageView: (tab: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_PAGE_VIEW, {
      value: tab,
      source
    })
  },

  settingsTabClick: (fromTab: string, toTab: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_TAB_CLICK, {
      from_sort: fromTab,
      to_sort: toTab,
      source
    })
  },

  exportData: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_EXPORT_DATA, { source })
  },

  settingsToggleChange: (setting: string, enabled: boolean, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_TOGGLE_CHANGE, {
      section: setting,
      value: enabled ? 'enabled' : 'disabled',
      source
    })
  },

  connectGitHub: (from: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_CONNECT_GITHUB, {
      section: from,
      source
    })
  },

  disconnectService: (service: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_DISCONNECT_SERVICE, {
      value: service,
      source
    })
  },

  settingsSave: (tab: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_SAVE, {
      value: tab,
      source
    })
  },

  dangerZoneToggle: (shown: boolean, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_DANGER_ZONE_TOGGLE, {
      value: shown ? 'show' : 'hide',
      source
    })
  },

  profileNavClick: (destination: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.PROFILE_NAV_CLICK, {
      destination,
      source
    })
  },

  settingsNavClick: (destination: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SETTINGS_NAV_CLICK, {
      destination,
      source
    })
  },

  backToProfileClick: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.BACK_TO_PROFILE_CLICK, { source })
  }
}

// Hook for tracking component mount/unmount
export function useAnalytics(_eventName: AnalyticsEvent, _props?: EventProps) {
  if (typeof window !== 'undefined') {
    // Track on mount if needed
    // trackEvent(eventName, props)
  }
}
