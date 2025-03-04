import { Card } from '@thedaviddias/design-system/card'
import { Section } from '@/components/layout/section'
import { SiReddit, SiX } from '@icons-pack/react-simple-icons'
import { Linkedin } from 'lucide-react'

const communities = [
  {
    name: 'Reddit',
    description:
      'Join our Reddit community to discuss llms.txt implementation and share your experiences.',
    icon: SiReddit,
    url: 'https://reddit.com/r/llmstxt'
  },
  {
    name: 'X Community',
    description: 'Follow us on X for the latest updates, tips, and community highlights.',
    icon: SiX,
    url: 'https://x.com/i/communities/1896567756608491718'
  },
  {
    name: 'LinkedIn',
    description:
      'Connect with professionals implementing llms.txt and stay updated with industry news.',
    icon: Linkedin,
    url: 'https://www.linkedin.com/groups/14615106/'
  }
]

export function CommunitiesSection() {
  return (
    <Section
      title="Join Our Communities"
      description="Connect with other developers and stay updated with the latest llms.txt news and discussions."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {communities.map(community => {
          const Icon = community.icon
          return (
            <a
              key={community.name}
              href={community.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="p-6 flex flex-col items-center text-center space-y-4 hover:bg-muted/50 transition-colors">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{community.name}</h3>
                <p className="text-sm text-muted-foreground">{community.description}</p>
                <span className="text-sm font-medium text-primary">Join Community →</span>
              </Card>
            </a>
          )
        })}
      </div>
    </Section>
  )
}
