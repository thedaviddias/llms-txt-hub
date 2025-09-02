---
task: m-refactor-dry-code
branch: feature/refactor-dry-code
status: in-progress
started: 2025-09-01
created: 2025-09-01
modules: [apps/web, packages, services/ingest, lib]
---

# Refactor Codebase for DRY Principles

## Problem/Goal
Improve code quality by identifying and eliminating repetitive code patterns across the codebase. Apply DRY (Don't Repeat Yourself) principles to make the code more maintainable, clean, and efficient.

## Success Criteria
- [ ] Identify all significant code duplications across the codebase
- [ ] Extract common patterns into reusable functions/components
- [ ] Consolidate similar utility functions into shared modules
- [ ] Reduce code duplication by at least 30%
- [ ] All tests continue to pass after refactoring
- [ ] Code follows existing conventions and patterns

## Context Manifest

### How Code Duplication Currently Exists Across the Codebase

This Next.js monorepo has grown organically with several areas showing clear DRY violations. The codebase follows a modern architecture with packages for shared utilities, a design system, and apps for different services. However, there are systematic patterns of duplication across multiple areas that impact maintainability.

**Duplicate Utility Functions:**

The `useDebounce` hook exists in TWO identical locations:
- `/apps/web/hooks/use-debounce.ts` (17 lines, minimal implementation)
- `/packages/hooks/src/use-debounce.tsx` (31 lines, with comprehensive JSDoc)

Both implementations are functionally identical but the packages version includes better documentation and typing. The web app appears to have its own copy instead of importing from the shared package.

**Duplicate Favorite Button Implementations:**

There are TWO completely separate FavoriteButton components with different APIs and styling approaches:
- `/apps/web/components/ui/favorite-button.tsx` (100 lines) - Advanced implementation with size variants, animation states, auth integration, and extensive styling
- `/apps/web/components/favorites/favorite-button.tsx` (58 lines) - Simpler implementation focused on basic toggle functionality

The advanced version supports multiple sizes ('sm', 'md', 'lg'), variant types ('default', 'ghost'), complex hover states, auth-aware tooltips, and sophisticated animation timing. The simpler version takes different props (`websiteSlug`, `websiteName`) versus (`slug`, `className`, `size`, `variant`) and uses a different context import path.

**Rate Limiting Pattern Duplication:**

Rate limiting logic is implemented in multiple places with similar but not identical patterns:
- `/apps/web/app/api/check-url/route.ts` contains inline rate limiting with in-memory Map storage
- `/apps/web/lib/rate-limiter.ts` contains a sophisticated Redis-backed rate limiting system with multiple endpoint configurations
- `/apps/web/lib/security-utils.ts` contains another rate limiting implementation using a shared Map

The inline implementation in check-url route duplicates the core rate limiting algorithm that already exists in the dedicated rate-limiter module. This creates maintenance burden and inconsistency in rate limiting behavior across endpoints.

**API Response Pattern Duplication:**

Multiple API routes follow similar error handling and response patterns but implement them manually:

In `/apps/web/app/api/websites/route.ts` (14 lines):
```typescript
export async function GET() {
  try {
    const websites = await getWebsites()
    return NextResponse.json(websites)
  } catch (error) {
    logger.error('Error fetching websites', { data: error, tags: { api: 'websites' } })
    return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
  }
}
```

In `/apps/web/app/api/csrf/route.ts` (17 lines):
```typescript
export async function GET() {
  try {
    const token = await createCSRFToken()
    return NextResponse.json({ token })
  } catch (_error) {
    return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
  }
}
```

Both follow identical try-catch patterns with NextResponse.json error handling, but implement it manually rather than using a shared wrapper.

**Form State Management Duplication:**

Form components show repeated patterns for loading states, error handling, and submission logic. The `EmailSubscriptionForm` component demonstrates a comprehensive pattern:
- `useState` for `isSubmitting`, `submitStatus` ('idle' | 'success' | 'error'), and `errorMessage`
- Standard async submission handler with try-catch
- CSRF token extraction from meta tags
- Success/error state rendering
- Loading button states with spinner icons

This same pattern appears in multiple form components but is implemented from scratch each time rather than extracted into a custom hook or wrapper.

**Security Validation Duplication:**

URL validation logic appears in multiple places:
- `/apps/web/app/api/check-url/route.ts` has inline URL validation checking for malicious protocols
- `/apps/web/lib/security-utils.ts` has a `sanitizeUrl` function with similar but more comprehensive validation

Both check for javascript:, data:, vbscript:, and file: protocols, but implement different error handling approaches and have slightly different validation rules.

**Search and Autocomplete Pattern Duplication:**

The search system contains sophisticated patterns for:
- Debounced input handling (using the duplicated useDebounce hook)
- Loading state management during async operations  
- Keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
- Click outside handling to close dropdowns
- Recent searches localStorage management

These patterns are likely repeated across other interactive components but implemented manually rather than extracted into reusable hooks.

### For DRY Refactoring Implementation: Areas Requiring Consolidation

**Priority 1 - Utility Function Consolidation:**
The useDebounce hook duplication should be eliminated by ensuring all components import from the packages version. The apps/web version should be removed and imports updated.

**Priority 2 - Component Abstraction:**
The FavoriteButton components need to be unified. The advanced version should become the canonical implementation, with the simpler version's use cases supported through props. This requires updating all consumers to use consistent prop interfaces.

**Priority 3 - API Pattern Extraction:**
Create a higher-order function or wrapper for API routes that standardizes:
- Error logging with consistent format
- NextResponse.json error responses  
- Rate limiting application
- CSRF validation where needed

**Priority 4 - Form State Abstraction:**
Extract the common form submission pattern into a custom hook that handles:
- Loading/submitting state
- Error message management  
- Success state handling
- CSRF token management
- Async submission with try-catch

**Priority 5 - Security Validation Consolidation:**
Centralize URL validation, rate limiting, and input sanitization into the security-utils module and remove inline implementations.

### Technical Reference Details

#### Current Duplication Inventory

**Hooks:**
- `useDebounce`: 2 implementations (should use packages/hooks version)

**Components:**
- `FavoriteButton`: 2 implementations with different APIs
- Loading states: Manual useState pattern repeated across components
- Form submission: Manual async/await pattern repeated

**API Utilities:**
- Rate limiting: 3 different implementations
- Error handling: Manual try-catch repeated across 7+ routes
- URL validation: 2 implementations with different coverage

**Security Patterns:**
- Input sanitization: Scattered across multiple files
- CSRF handling: Inline implementation in forms
- Origin validation: Single implementation but manually applied

#### Consolidation Targets

**Extract into Shared Hooks:**
```typescript
// Target: useAsyncFormState hook
// Consolidates: isSubmitting, submitStatus, errorMessage, handleSubmit patterns
// Used by: EmailSubscriptionForm and other form components

// Target: useKeyboardNavigation hook  
// Consolidates: Arrow key handling, Enter/Escape, selectedIndex management
// Used by: SearchAutocomplete and similar dropdown components

// Target: useClickOutside hook
// Consolidates: Click outside detection with ref management
// Used by: SearchAutocomplete, modals, dropdowns
```

**Extract into API Utilities:**
```typescript
// Target: withApiHandler wrapper
// Consolidates: try-catch, logging, error responses, rate limiting
// Replaces: Manual implementation in 7+ API routes

// Target: validateRequest utility
// Consolidates: CSRF, origin, input validation
// Standardizes: Security checks across API endpoints
```

**Component Consolidation:**
```typescript
// Target: Unified FavoriteButton
// Props: { slug, size?, variant?, className?, showAuth?: boolean }
// Replaces: Both current implementations
// Supports: All current use cases through optional props
```

#### File Locations for Implementation

**Remove Duplications:**
- Delete: `/apps/web/hooks/use-debounce.ts`
- Delete: One of the FavoriteButton implementations (TBD based on feature analysis)

**Create New Shared Utilities:**
- `/apps/web/lib/api-utils.ts` - For withApiHandler and common API patterns
- `/apps/web/hooks/use-form-state.ts` - For async form state management
- `/apps/web/hooks/use-keyboard-nav.ts` - For keyboard navigation patterns
- `/apps/web/hooks/use-click-outside.ts` - For click outside detection

**Update Existing Files:**
- `/apps/web/lib/security-utils.ts` - Consolidate all validation functions
- `/apps/web/lib/rate-limiter.ts` - Remove inline rate limiting from other files
- Multiple API route files - Refactor to use shared utilities

## User Notes
<!-- Any specific notes or requirements from the developer -->

## Work Log
<!-- Updated as work progresses -->
- [2025-09-01] Created task for code refactoring and DRY improvements