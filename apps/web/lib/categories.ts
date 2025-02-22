import { Brain, Code2, Cpu, Database, Lock, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface Category {
  name: string
  slug: string
  description: string
  icon: LucideIcon
}

export const categories: Category[] = [
  {
    name: 'AI & Machine Learning',
    slug: 'ai-ml',
    description: 'AI models, ML tools, and LLM platforms',
    icon: Brain
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'IDEs, CLIs, debugging and development tools',
    icon: Code2
  },
  {
    name: 'Data & Analytics',
    slug: 'data-analytics',
    description: 'Databases, analytics platforms, and data processing tools',
    icon: Database
  },
  {
    name: 'Infrastructure & Cloud',
    slug: 'infrastructure-cloud',
    description: 'Hosting, deployment, and cloud services',
    icon: Cpu
  },
  {
    name: 'Security & Identity',
    slug: 'security-identity',
    description: 'Security tools, authentication, and compliance solutions',
    icon: Lock
  },
  {
    name: 'Integration & Automation',
    slug: 'integration-automation',
    description: 'API platforms, workflow automation, and integration tools',
    icon: Workflow
  }
]
