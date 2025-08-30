'use client'

import { useState } from 'react'

export function SubstackEmbed() {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50 dark:bg-zinc-900">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Unable to load newsletter signup form.
        </p>
        <a
          href="https://thellmstxtdigest.substack.com/subscribe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
        >
          Subscribe on Substack
        </a>
      </div>
    )
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-zinc-900 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600" />
        </div>
      )}
      <iframe
        src="https://thellmstxtdigest.substack.com/embed"
        width="480"
        height="150"
        frameBorder="0"
        scrolling="no"
        title="The llms.txt Digest"
        className="substack-iframe"
        onLoad={handleLoad}
        onError={handleError}
        style={{ opacity: isLoading ? 0 : 1 }}
      />
      <style jsx>{`
        .substack-iframe {
          border-radius: 0.375rem;
          background: white;
          transition: opacity 0.3s ease-in-out;
        }
        
        :global(.dark) .substack-iframe {
          filter: invert(1) hue-rotate(180deg) saturate(1.25) brightness(1.1);
        }
      `}</style>
    </div>
  )
}
