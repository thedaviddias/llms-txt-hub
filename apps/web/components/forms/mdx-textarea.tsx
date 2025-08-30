'use client'

import { CharacterCounter } from '@/components/ui/character-counter'
import { Textarea } from '@thedaviddias/design-system/textarea'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface MDXTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * MDX textarea component with live preview
 */
export function MDXTextarea({ value, onChange, placeholder }: MDXTextareaProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const templateContent = `## Key Focus Areas
- **AI Integration**: Details about AI/ML capabilities
- **API Documentation**: Coverage of API endpoints and usage
- **Developer Tools**: Build tools, SDKs, and integrations
- **Data Processing**: How data is handled and transformed

## About llms.txt Implementation
Our llms.txt file provides comprehensive documentation about our platform's AI-ready content structure, making it easy for language models to understand and work with our system.`

  return (
    <div className="space-y-4">
      {/* Template Helper */}
      <div className="bg-muted/30 border border-muted rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Content Template</h4>
          <button
            type="button"
            onClick={() => onChange(templateContent)}
            className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
          >
            Use Template
          </button>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Use **bold** for emphasis and ## for headings</p>
          <p>• Click "Use Template" to insert example content</p>
          <p>• Switch to Preview tab to see how it will render</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'edit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'preview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'edit' ? (
          <div className="space-y-2">
            <Textarea
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={
                placeholder || 'Describe the key aspects of the llms.txt implementation...'
              }
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="flex justify-end">
              <CharacterCounter current={value.length} max={5000} />
            </div>
          </div>
        ) : (
          <div className="min-h-[200px] p-4 bg-muted/30 rounded-lg border border-gray-200 dark:border-gray-700">
            {value ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{value}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                Nothing to preview yet. Start typing in the Edit tab.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
