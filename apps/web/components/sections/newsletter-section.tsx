import { NewsletterForm } from '@/components/forms/newsletter-form'

export function NewsletterSection() {
  return (
    <section className="border py-4 sm:py-6">
      <div className="text-center">
        <NewsletterForm />
      </div>
    </section>
  )
}
