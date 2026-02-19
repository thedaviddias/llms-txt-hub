interface JsonLdProps {
  data: Record<string, any>
}

/**
 * Renders JSON-LD structured data in a script tag for search engine consumption.
 * Uses dangerouslySetInnerHTML to prevent React from HTML-escaping JSON characters.
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires unescaped JSON in script tags; data is developer-controlled, not user input
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
