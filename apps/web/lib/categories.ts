import { Code2, Wrench, Box, Cpu, Brain, Globe, Shield, Database } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface Category {
  name: string
  slug: string
  description: string
  icon: LucideIcon
}

export const categories: Category[] = [
  {
    name: "AI & Machine Learning",
    slug: "ai-ml",
    description: "AI models, machine learning frameworks, and related tools",
    icon: Brain,
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    description: "IDEs, code editors, and development utilities",
    icon: Wrench,
  },
  {
    name: "Frameworks",
    slug: "frameworks",
    description: "Web frameworks, libraries, and SDKs",
    icon: Code2,
  },
  {
    name: "Infrastructure",
    slug: "infrastructure",
    description: "Cloud services, hosting, and deployment platforms",
    icon: Cpu,
  },
  {
    name: "Security",
    slug: "security",
    description: "Security tools, authentication, and encryption",
    icon: Shield,
  },
  {
    name: "Databases",
    slug: "databases",
    description: "Database systems and data storage solutions",
    icon: Database,
  },
  {
    name: "Products",
    slug: "products",
    description: "Commercial and open-source products",
    icon: Box,
  },
  {
    name: "Websites",
    slug: "websites",
    description: "Websites and web applications",
    icon: Globe,
  },
]

