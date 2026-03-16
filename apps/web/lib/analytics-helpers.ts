import { ANALYTICS_EVENTS, trackEvent } from './analytics'

/** Convenience functions for common analytics events */
export const analytics = {
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

  sortChange: (fromSort: string, toSort: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SORT_CHANGE, {
      from_sort: fromSort,
      to_sort: toSort,
      source
    })
  },

  submitWebsite: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.SUBMIT_WEBSITE, { source })
  },

  joinCommunity: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.JOIN_COMMUNITY, { source })
  },

  newsletterSignup: (source?: string) => {
    trackEvent(ANALYTICS_EVENTS.NEWSLETTER_SIGNUP, { source })
  },

  toolClick: (toolName: string, toolUrl: string, source?: string) => {
    trackEvent(ANALYTICS_EVENTS.TOOL_CLICK, {
      value: toolName,
      destination: toolUrl,
      source
    })
  },

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
