## Learned User Preferences

- Always update legal docs (privacy.mdx, cookies.mdx) "Last updated" dates when their content changes
- When adding new environment variables, also add them to turbo.json tasks.build.env so Turborepo cache invalidates correctly
- All console.error calls should be replaced with logger.error from @thedaviddias/logging so errors reach Sentry; never show raw stack traces to users
- User-facing error messages should be helpful but safe: show the server's error message when available, fall back to a generic string otherwise
- When adding new exports to an internal package, add an explicit exports map to its package.json (follow the shorthand pattern used by other packages like @thedaviddias/utils)
- When a new import would push layout.tsx over the 15-import limit, re-export from an existing imported module instead of adding a separate import line
- Pre-commit hooks enforce JSDoc on all exported functions/components, no barrel files, no as-casts, biome formatting, conventional commits, and sorted package.json
- The check-file-complexity hook flags analytics.ts (pre-existing, ~84 cognitive complexity); this is known and not blocking
- GPG commit signing via 1Password can fail in automated contexts; use --no-gpg-sign as a workaround when needed
- Skip LEFTHOOK_EXCLUDE=check-file-complexity for commits touching analytics.ts since its complexity is pre-existing
- Always check package documentation for existing types before creating custom type declarations; internal packages should be self-contained and export their own types to consumers
- Always verify the full production build passes before committing dependency or config changes; Vercel's strict pnpm resolution catches phantom dependency issues that local hoisting hides

## Learned Workspace Facts

- Monorepo using pnpm workspaces + Turborepo with apps/web, packages/*, and configs/* directories
- Analytics package (@thedaviddias/analytics) tracks events via OpenPanel; OpenPanel is production-only
- Auth is handled by Clerk via @thedaviddias/auth package; the useAuth() hook provides { user, isLoaded, isSignedIn, signOut }
- Clerk signOut requires the middleware to allow POST requests with a next-action header (Server Actions) on page routes, otherwise it returns 405
- The @openpanel/web package (transitive dep of @openpanel/nextjs) declares a global Window.op type; the analytics package references it via `/// <reference types="@openpanel/web" />` in its entry point to propagate the type to all consumers
- Server-side OpenPanel SDK is at @openpanel/sdk (not @openpanel/nextjs); the class is OpenPanel (not OpenpanelSdk); the method is .track() (not .event())
- Shared TypeScript base config uses moduleResolution: "NodeNext" which requires explicit file extensions in relative imports; the auth package has pre-existing violations surfacing when type-checked from other packages
- The web app's middleware handles CSP with nonces, rate limiting, CSRF validation, Clerk auth, and analytics proxy routes (/api/op/ for OpenPanel)
- Every internal package that imports from `next` must declare it in both peerDependencies and devDependencies; manypkg's postinstall enforces that peerDependencies have matching devDependencies, and violating this causes infinite install loops
- Server-side fetch calls (GitHub API, metadata fetching) should use AbortController with timeouts to prevent hanging in serverless
- The @openpanel/nextjs OpenPanelComponent has zero CSP nonce support; it was replaced with a custom server component rendering raw `<script>` tags with nonce (same pattern as json-ld.tsx); the /api/op/ proxy route handler is inlined rather than importing from @openpanel/nextjs/server, which fails on Vercel as a transitive dependency
- Typefully integration is available for social media posts via the typefully skill; the user's social set ID is 290319 with X, LinkedIn, and Threads connected
