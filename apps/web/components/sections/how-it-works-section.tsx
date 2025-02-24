import { Code2, FileText, Zap } from 'lucide-react'

export function HowItWorksSection() {
  return (
    <section className="space-y-6 bg-muted p-8 rounded-lg">
      <h2 className="text-3xl font-bold text-center">How llms.txt Works</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center space-y-2">
          <FileText className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-xl font-semibold">1. Create llms.txt</h3>
          <p>Add an llms.txt file to your website's root directory.</p>
        </div>
        <div className="text-center space-y-2">
          <Code2 className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-xl font-semibold">2. Define Structure</h3>
          <p>Specify your documentation structure and AI preferences.</p>
        </div>
        <div className="text-center space-y-2">
          <Zap className="h-12 w-12 mx-auto text-primary" />
          <h3 className="text-xl font-semibold">3. Enhance AI Interactions</h3>
          <p>Improve how AI tools understand and interact with your content.</p>
        </div>
      </div>
    </section>
  )
}
