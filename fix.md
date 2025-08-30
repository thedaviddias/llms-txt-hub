╭───────────────────────────────────────╮
│ 🥊 lefthook v1.12.2  hook: pre-commit │
╰───────────────────────────────────────╯
│  check-mdx-length (skip) no files for inspection
│  sort-package-json (skip) no files for inspection
│  check-barrel-files (skip) no files for inspection
│  check-frontmatter (skip) no files for inspection
┃  check-directory-structure ❯

✅ Directory structure validation completed
⚠️  Warnings:
  - Recommended directory missing: src
  - Recommended directory missing: components
  - Consider organizing these root files: .DS_Store, .all-contributorsrc, .biomeignore, .commitlintrc.cjs, .cursorrules, .editorconfig, .lycheecache, .npmrc, .nvmrc, .syncpackrc, LICENCE, biome.json, lychee-out.md, lychee.toml, pnpm-workspace.yaml, turbo.json, vercel.json

┃  check-file-complexity ❯

❌ Complexity violations found:

📁 apps/web/app/u/[slug]/page.tsx:
  - File has 357 lines (limit: 300)


exit status 1┃  check-as-casts ❯

[34m🔍 Checking for 'as' type casts...[0m
[31m❌ Found 'as' type cast violations:[0m

[1m📁 apps/web/components/csrf-provider.tsx:[0m
  Line 15: [31mas HTMLMetaElement[0m
    [33mlet metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement[0m
  Line 15: [31m) as HTMLMetaElement[0m
    [33mlet metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement[0m

[31m❌ COMMIT BLOCKED: Found 2 'as' type casts![0m
[33m💡 Replace 'as' casts with proper type guards or type predicates[0m
[34m📋 Examples of better alternatives:[0m
  - Use type guards: if (typeof x === "string") { ... }
  - Use type predicates: function isString(x: unknown): x is string { ... }
  - Fix the source type instead of casting
  - Use generics for flexible types
  - If absolutely necessary, use type assertion functions instead[0m


exit status 1┃  check-console-logs ❯

[36m🔍 Checking for console logs...[0m
[32m✅ No console log violations found[0m

┃  check-jsdoc ❯

📚 Checking JSDoc documentation...

❌ JSDoc violations found:

📁 apps/web/app/api/csrf/route.ts:
  Line 4: GET (function)
    - Missing JSDoc comment for function

📁 apps/web/app/api/debug/clear-github-cache/route.ts:
  Line 5: POST (function)
    - Missing JSDoc comment for function

📁 apps/web/app/api/debug/clear-redis-cache/route.ts:
  Line 5: POST (function)
    - Missing JSDoc comment for function

📁 apps/web/app/api/debug/github-contributions/route.ts:
  Line 17: GET (function)
    - Missing JSDoc comment for function

📁 apps/web/app/api/debug/github-rate-limit/route.ts:
  Line 5: GET (function)
    - Missing JSDoc comment for function

📁 apps/web/app/api/debug/redis-cache/route.ts:
  Line 5: GET (function)
    - Missing JSDoc comment for function

📁 apps/web/components/csrf-provider.tsx:
  Line 5: CSRFProvider (function)
    - Missing JSDoc comment for function
  Line 8: initCSRF (function)
    - Missing JSDoc comment for function

💡 8 JSDoc violations found
📊 Documentation coverage: Functions 75%, Components 100%

exit status 1┃  check ❯

apps/web/__tests__/mocks/handlers.mock.ts:169:25 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    167 │     }
    168 │
  > 169 │     const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
        │                         ^^^^^^^^^^^^^^^^^^^^^
    170 │     const endIndex = startIndex + Number.parseInt(limit)
    171 │     const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    169 │ ····const·startIndex·=·(Number.parseInt(page,·10)·-·1)·*·Number.parseInt(limit)
        │                                             ++++

apps/web/__tests__/mocks/handlers.mock.ts:169:54 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    167 │     }
    168 │
  > 169 │     const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
        │                                                      ^^^^^^^^^^^^^^^^^^^^^^
    170 │     const endIndex = startIndex + Number.parseInt(limit)
    171 │     const paginatedProjects = filteredProjects.slice(startIndex, endIndex)

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    169 │ ····const·startIndex·=·(Number.parseInt(page)·-·1)·*·Number.parseInt(limit,·10)
        │                                                                           ++++

apps/web/__tests__/mocks/handlers.mock.ts:170:35 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    169 │     const startIndex = (Number.parseInt(page) - 1) * Number.parseInt(limit)
  > 170 │     const endIndex = startIndex + Number.parseInt(limit)
        │                                   ^^^^^^^^^^^^^^^^^^^^^^
    171 │     const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
    172 │

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    170 │ ····const·endIndex·=·startIndex·+·Number.parseInt(limit,·10)
        │                                                        ++++

apps/web/__tests__/mocks/handlers.mock.ts:177:17 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    175 │         projects: paginatedProjects,
    176 │         pagination: {
  > 177 │           page: Number.parseInt(page),
        │                 ^^^^^^^^^^^^^^^^^^^^^
    178 │           limit: Number.parseInt(limit),
    179 │           total: filteredProjects.length,

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    177 │ ··········page:·Number.parseInt(page,·10),
        │                                     ++++

apps/web/__tests__/mocks/handlers.mock.ts:178:18 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    176 │         pagination: {
    177 │           page: Number.parseInt(page),
  > 178 │           limit: Number.parseInt(limit),
        │                  ^^^^^^^^^^^^^^^^^^^^^^
    179 │           total: filteredProjects.length,
    180 │           totalPages: Math.ceil(filteredProjects.length / Number.parseInt(limit))

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    178 │ ··········limit:·Number.parseInt(limit,·10),
        │                                       ++++

apps/web/__tests__/mocks/handlers.mock.ts:180:59 lint/correctness/useParseIntRadix  FIXABLE  ━━━━━━━━━━

  i Missing radix parameter

    178 │           limit: Number.parseInt(limit),
    179 │           total: filteredProjects.length,
  > 180 │           totalPages: Math.ceil(filteredProjects.length / Number.parseInt(limit))
        │                                                           ^^^^^^^^^^^^^^^^^^^^^^
    181 │         }
    182 │       })

  i Add a non-fractional number between 2 and 36

  i Unsafe fix: Add a radix of 10

    180 │ ··········totalPages:·Math.ceil(filteredProjects.length·/·Number.parseInt(limit,·10))
        │                                                                                ++++

apps/web/__tests__/mocks/handlers.mock.ts:12:7 lint/correctness/noUnusedVariables  FIXABLE  ━━━━━━━━━━

  ! This variable API_URL is unused.

    11 │ // Base API URL - adjust based on your environment
  > 12 │ const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
       │       ^^^^^^^
    13 │
    14 │ // ============================================================================

  i Unused variables are often the result of an incomplete refactoring, typos, or other sources of bugs.

  i Unsafe fix: If this is intentional, prepend API_URL with an underscore.

     10  10 │
     11  11 │   // Base API URL - adjust based on your environment
     12     │ - const·API_URL·=·process.env.NEXT_PUBLIC_API_URL·||·'http://localhost:3000'
         12 │ + const·_API_URL·=·process.env.NEXT_PUBLIC_API_URL·||·'http://localhost:3000'
     13  13 │
     14  14 │   // ============================================================================


apps/web/app/api/csrf/route.ts:8:12 lint/correctness/noUnusedVariables  FIXABLE  ━━━━━━━━━━━━━━━━━━━

  ! This variable error is unused.

     6 │     const token = await createCSRFToken()
     7 │     return NextResponse.json({ token })
   > 8 │   } catch (error) {
       │            ^^^^^
     9 │     return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
    10 │   }

  i Unused variables are often the result of an incomplete refactoring, typos, or other sources of bugs.

  i Unsafe fix: If this is intentional, prepend error with an underscore.

     6  6 │       const token = await createCSRFToken()
     7  7 │       return NextResponse.json({ token })
     8    │ - ··}·catch·(error)·{
        8 │ + ··}·catch·(_error)·{
     9  9 │       return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
    10 10 │     }


apps/web/app/api/debug/github-rate-limit/route.ts:7:11 lint/correctness/noUnusedVariables  FIXABLE  ━━━━━━━━━━

  ! This variable githubClient is unused.

    5 │ export async function GET() {
    6 │   try {
  > 7 │     const githubClient = GitHubAPIClient.getInstance()
      │           ^^^^^^^^^^^^
    8 │
    9 │     // Make a simple request to check rate limit

  i Unused variables are often the result of an incomplete refactoring, typos, or other sources of bugs.

  i Unsafe fix: If this is intentional, prepend githubClient with an underscore.

     5  5 │   export async function GET() {
     6  6 │     try {
     7    │ - ····const·githubClient·=·GitHubAPIClient.getInstance()
        7 │ + ····const·_githubClient·=·GitHubAPIClient.getInstance()
     8  8 │
     9  9 │       // Make a simple request to check rate limit


apps/web/components/__tests__/csrf-provider.test.tsx:16:58 lint/suspicious/useIterableCallbackReturn ━━━━━━━━━━

  × This callback passed to forEach() iterable method should not return a value.

    14 │   beforeEach(() => {
    15 │     // Clear any existing meta tags
  > 16 │     document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => tag.remove())
       │                                                          ^^^^^^^
    17 │     // Reset fetch mock
    18 │     jest.clearAllMocks()

  i Either remove this return or remove the returned value.

    14 │   beforeEach(() => {
    15 │     // Clear any existing meta tags
  > 16 │     document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => tag.remove())
       │                                                                         ^^^^^^^^^^^^
    17 │     // Reset fetch mock
    18 │     jest.clearAllMocks()


apps/web/lib/__tests__/csrf-client.test.ts:13:58 lint/suspicious/useIterableCallbackReturn ━━━━━━━━━━

  × This callback passed to forEach() iterable method should not return a value.

    11 │   beforeEach(() => {
    12 │     // Clear any existing meta tags
  > 13 │     document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => tag.remove())
       │                                                          ^^^^^^^
    14 │     // Reset fetch mock
    15 │     jest.clearAllMocks()

  i Either remove this return or remove the returned value.

    11 │   beforeEach(() => {
    12 │     // Clear any existing meta tags
  > 13 │     document.querySelectorAll('meta[name="csrf-token"]').forEach(tag => tag.remove())
       │                                                                         ^^^^^^^^^^^^
    14 │     // Reset fetch mock
    15 │     jest.clearAllMocks()


Skipped 9 suggested fixes.
If you wish to apply the suggested (unsafe) fixes, use the command biome check --write --unsafe

Checked 31 files in 115ms. Fixed 4 files.
Found 2 errors.
Found 3 warnings.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while applying fixes.



exit status 1┃  check-relative-imports ❯


❌ Relative import violations found:

apps/web/app/api/csrf/__tests__/route.test.ts:2 - Avoid deep relative imports: "../route"
apps/web/components/__tests__/csrf-provider.test.tsx:6 - Avoid deep relative imports: "../csrf-provider"
apps/web/lib/__tests__/csrf-client.test.ts:5 - Avoid deep relative imports: "../csrf-client"

💡 Use path aliases (@/) instead of relative imports for better maintainability

exit status 1┃  test-modified ❯


> web@0.1.0 test:related /Users/thedaviddias/Projects/llms-txt-hub/apps/web
> jest --findRelatedTests --passWithNoTests --bail --maxWorkers=50% apps/web/__tests__/integration/submit-project-accessibility.test.tsx apps/web/__tests__/integration/submit-project-happy-path.test.tsx apps/web/__tests__/integration/submit-project-validation.test.tsx apps/web/__tests__/lib/security-rate-limiting.test.ts apps/web/__tests__/lib/security-validation.test.ts apps/web/__tests__/profile-pages.test.tsx apps/web/app/api/csrf/__tests__/route.test.ts apps/web/components/__tests__/csrf-provider.test.tsx apps/web/lib/__tests__/csrf-client.test.ts apps/web/lib/__tests__/csrf-protection.test.ts

Determining test suites to run...[999D[KNo tests found, exiting with code 0
[999D[K

[K
[1A

[K
[1A[999D[K

  ────────────────────────────────────
summary: (done in 5.79 seconds)
✔️ check-directory-structure (0.15 seconds)
✔️ check-console-logs (0.16 seconds)
✔️ test-modified (5.78 seconds)
🥊 check-file-complexity (0.15 seconds)
🥊 check-as-casts (0.15 seconds)
🥊 check-jsdoc (0.16 seconds)
🥊 check (0.81 seconds)
🥊 check-relative-imports (0.89 seconds)
