import { faqItems } from '@/components/sections/faq-section'
import { generateFAQSchema } from '@/lib/schema'
import { JsonLd } from '@/components/json-ld'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ - llms.txt Hub',
  description: 'Frequently asked questions about llms.txt and its implementation.',
  alternates: {
    canonical: `${getBaseUrl()}/faq`
  }
}

export default function FAQPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <JsonLd data={generateFAQSchema(faqItems)} />
      <div className="space-y-12">
        <Breadcrumb items={[{ name: 'FAQ', href: '/faq' }]} baseUrl={getBaseUrl()} />
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Common questions about llms.txt and its implementation
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          {faqItems.map((item, index) => (
            <div key={index} className="space-y-4">
              <h2 className="text-xl font-semibold">{item.question}</h2>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
