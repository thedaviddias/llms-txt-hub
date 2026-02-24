import { headers } from 'next/headers'

interface JsonLdProps {
  data: Record<string, any>
}

/**
 * Renders JSON-LD structured data in a script tag for search engine consumption.
 * Uses dangerouslySetInnerHTML to prevent React from HTML-escaping JSON characters.
 * Escapes `<` as `\u003c` to prevent script tag breakout from content-derived fields.
 */
export async function JsonLd({ data }: JsonLdProps) {
  const nonce = (await headers()).get('x-nonce') ?? undefined
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires unescaped JSON; content is sanitized above by escaping < to \u003c
      dangerouslySetInnerHTML={{ __html: safeJson }}
    />
  )
}
