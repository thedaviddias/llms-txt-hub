import { NewsletterForm } from '@/components/forms/newsletter-form'

export function NewsletterSection() {
  return (
    <section className="bg-muted p-8 rounded-lg">
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h2 className="text-3xl font-bold">Stay Updated with llms.txt hub</h2>
        <p className="text-muted-foreground">
          Subscribe to the newsletter for the latest updates on llms.txt and AI documentation best
          practices from the hub.
        </p>
        <NewsletterForm />
      </div>
    </section>
  )
}
