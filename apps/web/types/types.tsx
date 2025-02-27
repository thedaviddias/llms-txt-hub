export interface LLM {
  id: string
  name: string
  description: string
  provider: string
  website?: string
  avatarSrc?: string
  tags: string[]
}

export interface Guide {
  title: string
  description: string
  slug: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'getting-started' | 'implementation' | 'best-practices' | 'integration'
  icon?: string
  published: boolean
  publishedAt: string
}
