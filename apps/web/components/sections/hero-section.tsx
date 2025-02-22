import { getRoute } from '@/lib/routes'
import { Button } from '@thedaviddias/design-system/button'
import Link from 'next/link'

export function HeroSection() {
  return (
    <section className="text-center space-y-6 py-12">
      <h1 className="text-5xl font-bold tracking-tight md:text-6xl">Welcome to llms.txt hub</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
        Your central hub for AI-ready documentation and tools implementing the llms.txt standard.
      </p>
      <div className="flex justify-center gap-4 flex-col sm:flex-row">
        <Button asChild size="lg">
          <Link href={getRoute('submit')} className="w-full sm:w-auto">
            Submit Your llms.txt
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={getRoute('about')} className="w-full sm:w-auto">
            Learn More
          </Link>
        </Button>
      </div>
    </section>
  )
}
