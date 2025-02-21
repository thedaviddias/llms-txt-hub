interface JsonLdProps {
  data: Record<string, any>
}

export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json">{JSON.stringify(data)}</script>
}
