interface JsonLdProps {
  data: Record<string, any>
}

/**
 * Renders JSON-LD structured data in a script tag for search engine consumption.
 * Uses dangerouslySetInnerHTML to prevent React from HTML-escaping JSON characters.
 * Escapes `<` as `\u003c` to prevent script tag breakout from content-derived fields.
 */
export function JsonLd({ data }: JsonLdProps) {
  const safeJson = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires unescaped JSON; content is sanitized above by escaping < to \u003c
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />
  )
}
