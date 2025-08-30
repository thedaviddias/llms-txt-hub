'use client'

/**
 * Guidelines section for the submit form
 */
export function SubmitFormGuidelines() {
  return (
    <div className="mt-12 border-t border-muted pt-12">
      <h2 className="text-xl font-semibold mb-6">Guidelines & Requirements</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-base">What is llms.txt?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>A standardized file that helps AI assistants understand your project</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Should be placed at /llms.txt</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2 mt-1">•</span>
              <span>Contains key information about your project's purpose and structure</span>
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-base">Best Practices</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="text-green-500 mr-2 mt-1">✓</span>
              <span>Keep descriptions clear and concise</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2 mt-1">✓</span>
              <span>Include API documentation and usage examples</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2 mt-1">✓</span>
              <span>Mention key features and capabilities</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2 mt-1">✓</span>
              <span>Update regularly as your project evolves</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            role="img"
            aria-label="Information icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Need help creating your llms.txt?</p>
            <p className="text-amber-700 dark:text-amber-300">
              Check out the{' '}
              <a
                href="https://llmstxt.org"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                llmstxt.org
              </a>{' '}
              for documentation and examples.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
