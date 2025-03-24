'use client'

import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import ChatView from './chat-view'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function MessageBox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Call API to get assistant response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error fetching response:', error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // If we have chat history, show the chat view
  if (messages.length > 0) {
    return (
      <ChatView
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSubmit={handleSubmit}
      />
    )
  }

  // Otherwise show the initial message box
  return (
    <div className="w-full border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-medium mb-1 text-neutral-900 dark:text-neutral-100">
          Get started
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          What would you like to know about llms.txt files?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5">
        <div className="relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={3}
            className="w-full p-3 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:text-neutral-100 resize-none"
            placeholder="Ask a question about llms.txt files..."
          />
          <button
            type="submit"
            disabled={!input.trim()}
            aria-label="Send message"
            className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Or try one of these examples:
          </p>
          <div className="grid grid-cols-1 gap-2">
            <ExampleButton
              text="What models does ElevenLabs support?"
              onClick={() => setInput('What models does ElevenLabs support?')}
            />
            <ExampleButton
              text="Which providers have the largest context windows?"
              onClick={() => setInput('Which providers have the largest context windows?')}
            />
            <ExampleButton
              text="Show me the llms.txt structure for OpenRouter"
              onClick={() => setInput('Show me the llms.txt structure for OpenRouter')}
            />
            <ExampleButton
              text="What UX patterns for devs are available?"
              onClick={() => setInput('What UX patterns for devs are available?')}
            />
          </div>
        </div>
      </form>
    </div>
  )
}

function ExampleButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center text-left p-3 rounded-md border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
    >
      <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
      <span className="text-sm">{text}</span>
    </button>
  )
}
