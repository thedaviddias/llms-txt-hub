import { WebsiteCliSection } from '@/components/website/website-cli-section'
import { WebsiteLLMsSection } from '@/components/website/website-llms-section'
import type { WebsiteMetadata } from '@/lib/content-loader'

interface WebsiteDocsSectionProps {
  website: WebsiteMetadata
}

/**
 * Combined documentation section: CLI install (if available) followed by llms.txt files.
 *
 * @param props - Component props
 * @param props.website - Website metadata
 * @returns CLI install section and LLMs.txt file buttons
 */
export function WebsiteDocsSection({ website }: WebsiteDocsSectionProps) {
  return (
    <>
      <WebsiteCliSection website={website} />
      <WebsiteLLMsSection website={website} />
    </>
  )
}
