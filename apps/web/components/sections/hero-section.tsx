import { getRoute } from '@/lib/routes'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold tracking-tight md:text-6xl">Welcome to llms.txt hub</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Your central hub for AI-ready documentation and tools implementing the llms.txt standard.
      </p>
      <div className="flex justify-center gap-4 flex-col sm:flex-row">
        <Link
          href={getRoute('submit')}
          className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:ring-2 hover:slate-900"
        >
          Submit Your llms.txt
        </Link>
        <Link
          href={getRoute('about')}
          className="inline-flex justify-center rounded-lg text-sm font-semibold py-3 px-4 text-slate-900 ring-1 ring-slate-900/10 hover:bg-white/25 hover:ring-slate-900/15 dark:text-white dark:ring-white/10"
        >
          Learn More
        </Link>
      </div>
    </section>
  )
}
