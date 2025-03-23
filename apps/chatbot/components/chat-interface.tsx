'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, User, Trash2 } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll to bottom of messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
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
        content: data.response,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error fetching response:', error)
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-resize textarea as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Reset height first to get accurate scrollHeight
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }
  
  // Clear chat
  const clearChat = () => {
    setMessages([])
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto border border-neutral-200 rounded-xl shadow-sm bg-white dark:bg-neutral-900 dark:border-neutral-800">
      {/* Chat header */}
      <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span>LLMs.txt Chatbot</span>
        </h2>
        <button 
          onClick={clearChat} 
          className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          aria-label="Clear chat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-neutral-500 dark:text-neutral-400">
            <Bot className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Welcome to LLMs.txt Chatbot</h3>
            <p>Ask me anything about llms.txt files and I'll help you explore them.</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span className="text-xs opacity-75">
                    {message.role === 'user' ? 'You' : 'LLMs.txt Bot'}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-4 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4" />
                <span className="text-xs opacity-75">LLMs.txt Bot</span>
              </div>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input form */}
      <form onSubmit={handleSubmit} className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            rows={1}
            placeholder="Ask about llms.txt files..."
            className="w-full pr-12 pl-4 py-3 border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-neutral-800 dark:text-neutral-100 resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 bottom-2 p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}