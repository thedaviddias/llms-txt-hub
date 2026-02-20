import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { getWebsites } from '@/lib/content-loader'
import { getRoute } from '@/lib/routes'

/**
 * Hero section component for the homepage
 * Features: Bold typography, gradient text, staggered animations, enhanced CTAs
 * @returns JSX element containing the hero section with animated background and website count
 */
export async function HeroSection() {
  const websites = await getWebsites()
  const websiteCount = websites.length

  return (
    <section className="relative overflow-hidden py-12 md:py-16 lg:py-20">
      <AnimatedBackground />
      <div className="relative z-10 text-center space-y-6 md:space-y-8 py-4 md:py-8 px-6 max-w-4xl mx-auto">
        {/* Badge with count - stagger 1 */}
        <div className="animate-fade-in-up opacity-0 stagger-1">
          <Link
            className="mx-auto inline-flex items-center gap-2 md:gap-3 rounded-full border border-foreground/10 bg-background/50 backdrop-blur-sm px-3 py-1.5 text-xs md:text-sm font-medium transition-all hover:border-foreground/20 hover:bg-background/80 plausible-event-name=Category+Click"
            href={getRoute('home')}
          >
            <span className="inline-flex items-center rounded-full bg-foreground px-2.5 py-0.5 text-xs font-bold text-background tabular-nums">
              {websiteCount}
            </span>
            <span className="text-muted-foreground">Websites in directory</span>
          </Link>
        </div>

        {/* Main heading - stagger 2 */}
        <h1 className="animate-fade-in-up opacity-0 stagger-2 text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1]">
          <span className="whitespace-nowrap relative">
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
              llms.txt Hub
            </span>
          </span>
        </h1>

        {/* Description - stagger 3 */}
        <p className="animate-fade-in-up opacity-0 stagger-3 text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The largest directory for{' '}
          <span className="text-foreground font-medium">AI-ready documentation</span> and tools
          implementing the proposed llms.txt standard
        </p>

        {/* CTA Buttons - stagger 4 */}
        <div className="animate-fade-in-up opacity-0 stagger-4 flex justify-center gap-3 md:gap-4 flex-col sm:flex-row pt-2">
          <Link
            href={getRoute('submit')}
            className="group inline-flex items-center justify-center gap-2 rounded-none text-sm md:text-base font-bold py-3 md:py-4 px-6 md:px-8 bg-foreground text-background transition-all duration-300 hover:bg-foreground/90 hover:gap-3 press-effect plausible-event-name=Submit+Website"
          >
            Add Your llms.txt
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href={getRoute('about')}
            className="inline-flex items-center justify-center rounded-none text-sm md:text-base font-bold py-3 md:py-4 px-6 md:px-8 border-2 border-foreground/20 text-foreground transition-all duration-300 hover:border-foreground/40 hover:bg-foreground/5 press-effect plausible-event-name=External+Link+Click"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}
