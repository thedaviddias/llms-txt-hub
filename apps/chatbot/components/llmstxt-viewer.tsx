'use client'

import { useState } from 'react'

type LlmstxtFile = {
  url: string
  name: string
  content: string
  type: 'llms.txt' | 'llms-full.txt'
  lastFetched: string
}

// Simple syntax highlighting for llms.txt format
const highlightLlmsTxt = (content: string) => {
  return content.split('\n').map((line, index) => {
    if (line.startsWith('#')) {
      return (
        <div key={index} className="text-blue-600 dark:text-blue-400 font-bold">
          {line}
        </div>
      )
    } else if (line.includes(':')) {
      const [key, value] = line.split(':')
      return (
        <div key={index}>
          <span className="text-purple-600 dark:text-purple-400 font-semibold">{key}:</span>
          <span>{value}</span>
        </div>
      )
    } else {
      return <div key={index}>{line}</div>
    }
  })
}

export default function LlmsTxtViewer({ file }: { file: LlmstxtFile }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // For demo, show only first 10 lines when collapsed
  const contentPreview = isExpanded
    ? file.content
    : file.content.split('\n').slice(0, 10).join('\n') +
      (file.content.split('\n').length > 10 ? '\n...' : '')

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medium">
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {file.name} <span className="text-sm font-normal">({file.type})</span>
          </a>
        </h3>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Last fetched: {file.lastFetched}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-1">{file.url}</p>
      </div>

      <div className="bg-neutral-100 dark:bg-neutral-900 rounded-md p-3 mb-2 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
        {highlightLlmsTxt(contentPreview)}
      </div>

      {file.content.split('\n').length > 10 && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  )
}
