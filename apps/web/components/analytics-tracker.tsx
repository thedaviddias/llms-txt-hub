'use client'

import { analytics } from '@/lib/analytics'
import { useEffect } from 'react'

/**
 * Client-side analytics tracker that listens for clicks on elements with data-analytics attributes
 * This maintains SSR/SEO while adding analytics tracking
 */
export function AnalyticsTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const link = target.closest('[data-analytics]') as HTMLElement

      if (!link) return

      const analyticsType = link.getAttribute('data-analytics')

      switch (analyticsType) {
        case 'website-click': {
          const websiteName = link.getAttribute('data-website-name')
          const websiteSlug = link.getAttribute('data-website-slug')
          const source = link.getAttribute('data-source')

          if (websiteName && websiteSlug) {
            analytics.websiteClick(websiteName, websiteSlug, source || undefined)
          }
          break
        }

        case 'member-click': {
          const memberName = link.getAttribute('data-member-name')
          const memberSlug = link.getAttribute('data-member-slug')
          const source = link.getAttribute('data-source')

          if (memberName && memberSlug) {
            analytics.memberClick(memberName, memberSlug, source || undefined)
          }
          break
        }

        case 'github-link': {
          const username = link.getAttribute('data-username')
          const source = link.getAttribute('data-source')

          if (username) {
            analytics.githubLink(username, source || undefined)
          }
          break
        }

        case 'external-link': {
          const url = link.getAttribute('href')
          const text = link.textContent
          const source = link.getAttribute('data-source')

          if (url) {
            analytics.externalLink(url, text || url, source || undefined)
          }
          break
        }

        case 'category-click': {
          const categoryName = link.getAttribute('data-category-name')
          const categorySlug = link.getAttribute('data-category-slug')
          const source = link.getAttribute('data-source')

          if (categoryName && categorySlug) {
            analytics.categoryClick(categoryName, categorySlug, source || undefined)
          }
          break
        }

        case 'tool-click': {
          const toolName = link.getAttribute('data-tool-name')
          const toolUrl = link.getAttribute('href')
          const source = link.getAttribute('data-source')

          if (toolName && toolUrl) {
            analytics.toolClick(toolName, toolUrl, source || undefined)
          }
          break
        }

        case 'cta-click': {
          const ctaType = link.getAttribute('data-cta-type')
          const source = link.getAttribute('data-source')

          switch (ctaType) {
            case 'submit-website':
              analytics.submitWebsite(source || undefined)
              break
            case 'join-community':
              analytics.joinCommunity(source || undefined)
              break
            case 'newsletter-signup':
              analytics.newsletterSignup(source || undefined)
              break
          }
          break
        }
      }
    }

    // Listen for clicks on the document
    document.addEventListener('click', handleClick)

    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick)
    }
  }, [])

  // This component doesn't render anything
  return null
}

/**
 * Hook for tracking events that don't involve clicks (like load more, sort changes, etc.)
 * These need to be in client components
 */
export function useAnalyticsEvents() {
  return {
    trackLoadMore: (
      type: 'websites' | 'members',
      itemsLoaded: number,
      totalItems: number,
      source?: string
    ) => {
      analytics.loadMore(type, itemsLoaded, totalItems, source)
    },

    trackShowAll: (type: 'websites' | 'members', totalItems: number, source?: string) => {
      analytics.showAll(type, totalItems, source)
    },

    trackShowLess: (source?: string) => {
      analytics.showLess(source)
    },

    trackSearch: (query: string, resultsCount: number, source?: string) => {
      analytics.search(query, resultsCount, source)
    },

    trackSearchAutocomplete: (query: string, suggestion: string, source?: string) => {
      analytics.searchAutocomplete(query, suggestion, source)
    },

    trackSortChange: (fromSort: string, toSort: string, source?: string) => {
      analytics.sortChange(fromSort, toSort, source)
    },

    // Form Events
    trackFormStepStart: (step: number, formName: string, source?: string) => {
      analytics.formStepStart(step, formName, source)
    },

    trackFormStepComplete: (step: number, formName: string, source?: string) => {
      analytics.formStepComplete(step, formName, source)
    },

    trackFormError: (step: number, errorMessage: string, formName: string, source?: string) => {
      analytics.formError(step, errorMessage, formName, source)
    },

    trackFetchMetadataSuccess: (website: string, source?: string) => {
      analytics.fetchMetadataSuccess(website, source)
    },

    trackFetchMetadataError: (website: string, errorMessage: string, source?: string) => {
      analytics.fetchMetadataError(website, errorMessage, source)
    },

    trackSubmitSuccess: (website: string, category: string, source?: string) => {
      analytics.submitSuccess(website, category, source)
    },

    trackSubmitError: (website: string, errorMessage: string, source?: string) => {
      analytics.submitError(website, errorMessage, source)
    },

    // Profile Events
    trackProfileModalOpen: (source?: string) => {
      analytics.profileModalOpen(source)
    },

    trackProfileUpdateSuccess: (isPublic: boolean, source?: string) => {
      analytics.profileUpdateSuccess(isPublic, source)
    },

    trackProfileUpdateError: (errorMessage: string, source?: string) => {
      analytics.profileUpdateError(errorMessage, source)
    },

    trackProfileVisibilityToggle: (isPublic: boolean, source?: string) => {
      analytics.profileVisibilityToggle(isPublic, source)
    },

    trackAccountDeleteStart: (source?: string) => {
      analytics.accountDeleteStart(source)
    },

    trackAccountDeleteSuccess: (source?: string) => {
      analytics.accountDeleteSuccess(source)
    },

    trackAccountDeleteCancel: (source?: string) => {
      analytics.accountDeleteCancel(source)
    }
  }
}
