import type { LucideIcon } from 'lucide-react'
import { Brain, Code2, Cpu, Database, Lock, User, Workflow } from 'lucide-react'

export interface Category {
  name: string
  slug: string
  description: string
  icon: LucideIcon
  priority: 'high' | 'medium' | 'low'
}

export const categories: Category[] = [
  {
    name: 'AI & Machine Learning',
    slug: 'ai-ml',
    description: 'AI models, ML tools, and LLM platforms',
    icon: Brain,
    priority: 'high'
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'IDEs, CLIs, debugging and development tools',
    icon: Code2,
    priority: 'high'
  },
  {
    name: 'Data & Analytics',
    slug: 'data-analytics',
    description: 'Databases, analytics platforms, and data processing tools',
    icon: Database,
    priority: 'high'
  },
  {
    name: 'Infrastructure & Cloud',
    slug: 'infrastructure-cloud',
    description: 'Hosting, deployment, and cloud services',
    icon: Cpu,
    priority: 'high'
  },
  {
    name: 'Security & Identity',
    slug: 'security-identity',
    description: 'Security tools, authentication, and compliance solutions',
    icon: Lock,
    priority: 'high'
  },
  {
    name: 'Integration & Automation',
    slug: 'integration-automation',
    description: 'API platforms, workflow automation, and integration tools',
    icon: Workflow,
    priority: 'high'
  },
  {
    name: 'Personal Sites',
    slug: 'personal-sites',
    description: 'Personal developer portfolios and blogs',
    icon: User,
    priority: 'low'
  }
]
