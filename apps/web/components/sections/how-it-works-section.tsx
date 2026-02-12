import { Code2, FileText, Zap } from 'lucide-react'
import { Section } from '@/components/layout/section'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Renders the "How llms.txt Works" explainer section
 */
export function HowItWorksSection() {
  return (
    <Section
      title="How llms.txt Works"
      description="Learn how to implement llms.txt in three simple steps"
    >
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-2 text-center space-y-1.5">
            <div className="bg-primary/10 p-2 sm:p-2.5 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mx-auto">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold">1. Create llms.txt</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Add a llms.txt file to your website's root directory with markdown format, similar to
              robots.txt.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center space-y-1.5">
            <div className="bg-primary/10 p-2 sm:p-2.5 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mx-auto">
              <Code2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold">2. Define Structure</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Specify your website's content structure and documentation paths.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center space-y-1.5">
            <div className="bg-primary/10 p-2 sm:p-2.5 rounded-full w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center mx-auto">
              <Zap className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold">3. Enhance AI Interactions</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Help AI models better understand and navigate your website's content.
            </p>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}
