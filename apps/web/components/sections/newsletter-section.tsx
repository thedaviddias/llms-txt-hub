import { NewsletterForm } from '@/components/forms/newsletter-form'

export function NewsletterSection() {
  return (
    <section className="border py-4 sm:py-6">
      <div className="text-center space-y-3">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Stay Updated with llms.txt hub!
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Join the newsletter for the latest updates on llms.txt and AI documentation best
            practices from the hub.
          </p>
        </div>
        <div className="pt-2">
          <NewsletterForm />
        </div>
      </div>
    </section>
  )
}
