import { NewsletterForm } from '@/components/forms/newsletter-form'

export function NewsletterSection() {
  return (
    <section className="bg-card border border-border shadow-sm p-8 rounded-lg">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">Stay Updated with llms.txt hub!</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Subscribe to my newsletter "David's Dev Diary" for the latest updates on llms.txt and AI
            documentation best practices from the hub.
          </p>
        </div>
        <NewsletterForm />
      </div>
    </section>
  )
}
