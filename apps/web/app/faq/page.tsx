import { Breadcrumb } from '@thedaviddias/design-system/breadcrumb'
import { getBaseUrl } from '@thedaviddias/utils/get-base-url'
import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { faqItems } from '@/components/sections/faq-section'
import { getRoute } from '@/lib/routes'
import { generateFAQSchema } from '@/lib/schema'
import { generateBaseMetadata } from '@/lib/seo/seo-config'

export const metadata: Metadata = generateBaseMetadata({
  title: 'llms.txt FAQ - What is llms.txt & How to Implement It',
  description:
    'Answers to common questions about the llms.txt standard: what is llms.txt, how to create an llms.txt file, implementation guide, and best practices for AI-ready documentation.',
  path: '/faq',
  keywords: [
    'what is llms.txt',
    'llms.txt FAQ',
    'how to implement llms.txt',
    'llms.txt guide',
    'llms.txt help',
    'create llms.txt file',
    'llms.txt best practices'
  ]
})

export default function FAQPage() {
  const breadcrumbItems = [{ name: 'FAQ', href: getRoute('faq') }]

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <JsonLd data={generateFAQSchema(faqItems)} />
        <Breadcrumb items={breadcrumbItems} baseUrl={getBaseUrl()} />
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
