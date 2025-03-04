import { faqItems } from '@/components/sections/faq-section'
import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ - llms.txt hub',
  description: 'Frequently asked questions about llms.txt and the llms.txt hub.'
}

export default function FAQPage() {
  const breadcrumbItems = [{ name: 'FAQ', href: '/faq' }]

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <div className="space-y-6">
          {faqItems.map((item, index) => (
            <div key={index} className="space-y-2">
              <h2 className="text-xl font-semibold">{item.question}</h2>
              <p className="text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
