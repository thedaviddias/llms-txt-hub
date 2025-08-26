import type { LucideIcon } from 'lucide-react'
import { 
  Brain, 
  Code2, 
  Cpu, 
  Database, 
  Lock, 
  Workflow,
  User,
  Briefcase,
  ShoppingCart,
  GraduationCap,
  FileText,
  Globe,
  Package
} from 'lucide-react'

export interface Category {
  name: string
  slug: string
  description: string
  icon: LucideIcon
  priority: 'high' | 'medium' | 'low'
  type: 'tool' | 'non-tool'
}

export const categories: Category[] = [
  // Primary Categories - Tools & Platforms
  {
    name: 'AI & Machine Learning',
    slug: 'ai-ml',
    description: 'AI models, ML tools, LLM platforms, and AI services',
    icon: Brain,
    priority: 'high',
    type: 'tool'
  },
  {
    name: 'Developer Tools',
    slug: 'developer-tools',
    description: 'SDKs, APIs, frameworks, libraries, IDEs, and development utilities',
    icon: Code2,
    priority: 'high',
    type: 'tool'
  },
  {
    name: 'Data & Analytics',
    slug: 'data-analytics',
    description: 'Databases, analytics platforms, BI tools, and data processing',
    icon: Database,
    priority: 'high',
    type: 'tool'
  },
  {
    name: 'Integration & Automation',
    slug: 'integration-automation',
    description: 'API platforms, workflow automation, CI/CD, and integration tools',
    icon: Workflow,
    priority: 'high',
    type: 'tool'
  },
  {
    name: 'Infrastructure & Cloud',
    slug: 'infrastructure-cloud',
    description: 'Cloud platforms, hosting, containers, and DevOps tools',
    icon: Cpu,
    priority: 'high',
    type: 'tool'
  },
  {
    name: 'Security & Identity',
    slug: 'security-identity',
    description: 'Security tools, authentication, encryption, and compliance',
    icon: Lock,
    priority: 'high',
    type: 'tool'
  },
  
  // Secondary Categories - Non-Tools
  {
    name: 'Personal & Portfolio',
    slug: 'personal',
    description: 'Personal websites, developer portfolios, and blogs',
    icon: User,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'Agency & Services',
    slug: 'agency-services',
    description: 'Marketing agencies, consultancies, and service providers',
    icon: Briefcase,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'E-commerce',
    slug: 'ecommerce',
    description: 'Online stores, marketplaces, and retail sites',
    icon: ShoppingCart,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'Education',
    slug: 'education',
    description: 'Courses, tutorials, training platforms, and schools',
    icon: GraduationCap,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'Media & Content',
    slug: 'media-content',
    description: 'Blogs, news sites, publications, and content platforms',
    icon: FileText,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'International',
    slug: 'international',
    description: 'Non-English sites and international content',
    icon: Globe,
    priority: 'low',
    type: 'non-tool'
  },
  {
    name: 'Other',
    slug: 'other',
    description: 'Sites that don\'t fit into other categories',
    icon: Package,
    priority: 'low',
    type: 'non-tool'
  }
]

// Helper functions
export const toolCategories = categories.filter(c => c.type === 'tool')
export const nonToolCategories = categories.filter(c => c.type === 'non-tool')

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return categories.find(c => c.slug === slug)
}

export const getCategoryIcon = (slug: string): LucideIcon => {
  const category = getCategoryBySlug(slug)
  return category?.icon || Package
}