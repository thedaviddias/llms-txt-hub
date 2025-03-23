import { ModeToggle } from '@/components/mode-toggle'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import MessageBox from '@/components/message-box'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-neutral-950">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto flex items-center justify-between px-4 h-16">
          <Link 
            href="https://llmstxthub.com" 
            className="text-neutral-900 dark:text-white font-medium flex items-center gap-2"
          >
            <Bot className="w-5 h-5" />
            <span>llms.txt Chatbot</span>
          </Link>
          <ModeToggle />
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl mx-auto">
          {/* Centered branding */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-3 text-neutral-900 dark:text-neutral-100">
              llms.txt Chat Explorer
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              Ask questions about llms.txt files across the ecosystem. 
              Explore LLM capabilities, context windows, models, and more.
            </p>
          </div>
          
          {/* Message box */}
          <MessageBox />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-4 bg-white dark:bg-neutral-900">
        <div className="container mx-auto px-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          <p>Powered by <a href="https://llmstxthub.com" className="underline hover:text-neutral-900 dark:hover:text-neutral-200">llms.txt Hub</a> | Data collected from open source implementations</p>
        </div>
      </footer>
    </div>
  )
}