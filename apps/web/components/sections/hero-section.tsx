import Link from 'next/link'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { getWebsites } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

/**
 * Hero section component for the homepage
 * @returns JSX element containing the hero section with animated background and website count
 */
export async function HeroSection() {
  const websites = await getWebsites()
  const websiteCount = websites.length

  return (
    <section className="relative overflow-hidden py-8 md:py-12">
      <AnimatedBackground />
      <div className="relative z-10 text-center space-y-4 md:space-y-6 py-4 md:py-8 px-6">
        <Link
          className="mx-auto mb-2 md:mb-3 inline-flex items-center gap-2 md:gap-3 rounded-full border px-2 py-1 text-xs md:text-sm plausible-event-name=Category+Click"
          href={getRoute('home')}
        >
          <div className="inline-flex items-center rounded-full border px-2 md:px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
            {websiteCount}
          </div>
          Websites in list
        </Link>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          Welcome to <span className="whitespace-nowrap">llms.txt hub</span>
        </h1>
        <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
          The largest directory for AI-ready documentation and tools implementing the proposed
          llms.txt standard
        </p>

        {/* Hero Search Bar */}
        {/* <div className="py-2">
          <HeroSearch />
        </div> */}

        <div className="flex justify-center gap-3 md:gap-4 flex-col md:flex-row">
          <Link
            href={getRoute('submit')}
            className="inline-flex justify-center rounded-md md:rounded-lg text-sm md:text-base font-semibold py-2 md:py-3 px-4 md:px-6 text-slate-900 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:ring-2 hover:slate-900 plausible-event-name=Submit+Website"
          >
            Add Your llms.txt
          </Link>
          <Link
            href={getRoute('about')}
            className="inline-flex justify-center rounded-md md:rounded-lg text-sm md:text-base font-semibold py-2 md:py-3 px-4 md:px-6 text-slate-900 ring-1 ring-slate-900/10 hover:bg-white/25 hover:ring-slate-900/15 dark:text-white dark:ring-white/10 plausible-event-name=External+Link+Click"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}
