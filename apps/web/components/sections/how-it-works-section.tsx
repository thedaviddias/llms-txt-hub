import { Code2, FileText, Zap } from 'lucide-react'

export function HowItWorksSection() {
  return (
    <section className="space-y-8 bg-secondary/70 border border-border shadow-sm p-8 rounded-lg">
      <h2 className="text-3xl font-bold text-center text-foreground">How llms.txt Works</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center space-y-3 bg-background/50 p-6 rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
          <div className="bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">1. Create llms.txt</h3>
          <p className="text-muted-foreground">
            Add an llms.txt file to your website's root directory.
          </p>
        </div>
        <div className="text-center space-y-3 bg-background/50 p-6 rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
          <div className="bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">2. Define Structure</h3>
          <p className="text-muted-foreground">
            Specify your documentation structure and AI preferences.
          </p>
        </div>
        <div className="text-center space-y-3 bg-background/50 p-6 rounded-lg border border-border/50 hover:border-primary/20 hover:shadow-md transition-all">
          <div className="bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">3. Enhance AI Interactions</h3>
          <p className="text-muted-foreground">
            Improve how AI tools understand and interact with your content.
          </p>
        </div>
      </div>
    </section>
  )
}
