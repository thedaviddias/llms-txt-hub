import { getAllWebsites } from '@/lib/mdx'
import { getRoute } from '@/lib/routes'
import Link from 'next/link'

export async function HeroSection() {
  const websites = await getAllWebsites()
  const websiteCount = websites.length

  return (
    <section className="text-center space-y-6 py-12">
      <Link
        className="mx-auto mb-3 inline-flex items-center gap-3 rounded-full border px-2 py-1 text-sm"
        href={getRoute('website.list')}
      >
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
          {websiteCount}
        </div>
        Websites in list
      </Link>
      <h1 className="text-5xl font-bold tracking-tight md:text-6xl">Welcome to llms.txt hub</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        The largest directory for AI-ready documentation and tools implementing the proposed
        llms.txt standard
      </p>

      {/* Hero Search Bar */}
      {/* <div className="py-2">
        <HeroSearch />
      </div> */}

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
