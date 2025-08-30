import type { Category } from '@/lib/categories'

interface CategorySEOConfig {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  h1Title: string
  introText: string
  faqQuestions?: Array<{
    question: string
    answer: string
  }>
}

// SEO-optimized content for each category
export const categorySEOContent: Record<string, CategorySEOConfig> = {
  featured: {
    metaTitle: 'Featured Tools & Platforms with llms.txt',
    metaDescription:
      'Discover featured tools, platforms, and services implementing llms.txt standard. Curated selection of the best AI-ready documentation tools.',
    keywords: [
      'featured tools',
      'featured platforms',
      'llms.txt',
      'AI tools',
      'curated tools',
      'best llms.txt implementations',
      'AI documentation'
    ],
    h1Title: 'Featured Tools & Platforms',
    introText:
      'Curated selection of the best tools, platforms, and services implementing the llms.txt standard for AI-ready documentation.',
    faqQuestions: [
      {
        question: 'What makes a tool featured?',
        answer:
          'Featured tools are selected based on their implementation quality, popularity, and contribution to the llms.txt ecosystem.'
      },
      {
        question: 'How can I get my tool featured?',
        answer:
          'Submit your tool with a complete llms.txt implementation. We regularly review and feature high-quality implementations that benefit the community.'
      }
    ]
  },
  'developer-tools': {
    metaTitle: 'Developer Tools with llms.txt | APIs, IDEs & Frameworks',
    metaDescription:
      'Discover developer tools and APIs implementing llms.txt standard for AI integration. Find frameworks, libraries, IDEs, and development utilities with LLM-ready documentation.',
    keywords: [
      'developer tools',
      'APIs',
      'frameworks',
      'libraries',
      'IDEs',
      'development utilities',
      'llms.txt',
      'AI integration',
      'LLM documentation'
    ],
    h1Title: 'Developer Tools & APIs',
    introText:
      'Essential developer tools, APIs, and frameworks with llms.txt documentation for seamless AI integration. Build smarter applications with LLM-ready resources.',
    faqQuestions: [
      {
        question: 'What are developer tools with llms.txt?',
        answer:
          'Developer tools with llms.txt are APIs, frameworks, and utilities that provide structured documentation specifically designed for AI and LLM integration.'
      },
      {
        question: 'How do llms.txt-enabled developer tools help?',
        answer:
          'They provide machine-readable documentation that allows AI assistants to understand and use the tools more effectively, speeding up development.'
      }
    ]
  },
  'ai-ml': {
    metaTitle: 'AI & Machine Learning Platforms with llms.txt Documentation',
    metaDescription:
      'Explore AI models, ML tools, and LLM platforms with llms.txt standard. Find machine learning services with structured AI-ready documentation for better integration.',
    keywords: [
      'AI tools',
      'machine learning',
      'LLM platforms',
      'AI models',
      'ML services',
      'llms.txt',
      'AI documentation',
      'neural networks'
    ],
    h1Title: 'AI & Machine Learning Platforms',
    introText:
      'Leading AI and ML platforms implementing llms.txt for enhanced documentation. Access models, tools, and services with structured AI-readable guides.',
    faqQuestions: [
      {
        question: 'Which AI platforms support llms.txt?',
        answer:
          'Many modern AI platforms and ML services now include llms.txt files to provide structured documentation for better AI assistant integration.'
      },
      {
        question: 'Why is llms.txt important for AI tools?',
        answer:
          'It creates a standardized way for AI assistants to understand and interact with AI/ML platforms, improving automation and integration capabilities.'
      }
    ]
  },
  'data-analytics': {
    metaTitle: 'Data & Analytics Tools with llms.txt | Databases & BI Platforms',
    metaDescription:
      'Find databases, analytics platforms, and BI tools with llms.txt documentation. Discover data processing solutions with AI-ready structured documentation.',
    keywords: [
      'data analytics',
      'databases',
      'BI tools',
      'data processing',
      'analytics platforms',
      'llms.txt',
      'business intelligence'
    ],
    h1Title: 'Data & Analytics Solutions',
    introText:
      'Powerful data and analytics platforms with llms.txt support. Access databases, BI tools, and processing solutions with AI-optimized documentation.',
    faqQuestions: [
      {
        question: 'How do data tools benefit from llms.txt?',
        answer:
          'Data tools with llms.txt provide structured documentation that helps AI assistants understand complex data operations, queries, and analytics workflows.'
      }
    ]
  },
  'infrastructure-cloud': {
    metaTitle: 'Cloud & Infrastructure with llms.txt | DevOps & Hosting',
    metaDescription:
      'Discover cloud platforms, hosting services, and DevOps tools with llms.txt. Find container orchestration and infrastructure solutions with AI-ready docs.',
    keywords: [
      'cloud platforms',
      'infrastructure',
      'DevOps',
      'hosting',
      'containers',
      'Kubernetes',
      'llms.txt',
      'cloud computing'
    ],
    h1Title: 'Infrastructure & Cloud Services',
    introText:
      'Modern cloud and infrastructure platforms implementing llms.txt. Deploy and manage with AI-assisted documentation and automation.',
    faqQuestions: [
      {
        question: 'Which cloud providers support llms.txt?',
        answer:
          'Major cloud platforms and infrastructure providers are adopting llms.txt to make their documentation more accessible to AI development assistants.'
      }
    ]
  },
  'security-identity': {
    metaTitle: 'Security & Identity Tools with llms.txt | Auth & Encryption',
    metaDescription:
      'Security tools, authentication services, and encryption platforms with llms.txt. Find compliance and identity solutions with structured AI documentation.',
    keywords: [
      'security tools',
      'authentication',
      'encryption',
      'compliance',
      'identity management',
      'llms.txt',
      'cybersecurity'
    ],
    h1Title: 'Security & Identity Management',
    introText:
      'Comprehensive security and identity solutions with llms.txt documentation. Protect your applications with AI-enhanced security tools.',
    faqQuestions: [
      {
        question: 'Are llms.txt files secure for security tools?',
        answer:
          'Yes, llms.txt files only contain documentation and public API information, not sensitive data or credentials.'
      }
    ]
  },
  'automation-workflow': {
    metaTitle: 'Automation & Workflow Tools with llms.txt | Integration Platforms',
    metaDescription:
      'Workflow automation, integration platforms, and productivity tools with llms.txt. Streamline processes with AI-ready documentation and automation.',
    keywords: [
      'automation',
      'workflow',
      'integration platforms',
      'productivity tools',
      'process automation',
      'llms.txt'
    ],
    h1Title: 'Automation & Workflow Tools',
    introText:
      'Advanced automation and workflow platforms with llms.txt support. Build intelligent workflows with AI-assisted integration.',
    faqQuestions: [
      {
        question: 'How does llms.txt improve workflow automation?',
        answer:
          'It provides structured documentation that AI assistants can use to understand and create complex automation workflows more effectively.'
      }
    ]
  },
  'finance-fintech': {
    metaTitle: 'Finance & Fintech with llms.txt | Payment & Banking APIs',
    metaDescription:
      'Financial services, payment platforms, and fintech tools with llms.txt documentation. Access banking APIs with structured AI-ready guides.',
    keywords: [
      'fintech',
      'financial services',
      'payment platforms',
      'banking APIs',
      'cryptocurrency',
      'llms.txt'
    ],
    h1Title: 'Finance & Fintech Solutions',
    introText:
      'Leading financial services and fintech platforms with llms.txt implementation. Build financial applications with AI-optimized documentation.',
    faqQuestions: [
      {
        question: 'Is llms.txt suitable for financial services?',
        answer:
          'Yes, llms.txt only provides documentation structure and does not expose sensitive financial data or credentials.'
      }
    ]
  },
  'marketing-sales': {
    metaTitle: 'Marketing & Sales Tools with llms.txt | CRM & Engagement',
    metaDescription:
      'Marketing tools, CRM platforms, and sales solutions with llms.txt. Find customer engagement tools with AI-ready structured documentation.',
    keywords: [
      'marketing tools',
      'CRM',
      'sales platforms',
      'customer engagement',
      'email marketing',
      'llms.txt'
    ],
    h1Title: 'Marketing & Sales Platforms',
    introText:
      'Powerful marketing and sales tools implementing llms.txt. Enhance customer engagement with AI-assisted marketing solutions.',
    faqQuestions: [
      {
        question: 'How do marketing tools use llms.txt?',
        answer:
          'Marketing platforms use llms.txt to provide structured documentation that helps AI assistants automate campaigns and analyze customer data.'
      }
    ]
  },
  'ecommerce-retail': {
    metaTitle: 'E-commerce Platforms with llms.txt | Online Stores & Marketplaces',
    metaDescription:
      'Online stores, marketplaces, and retail platforms with llms.txt documentation. Build e-commerce solutions with AI-ready integration guides.',
    keywords: [
      'e-commerce',
      'online stores',
      'marketplaces',
      'retail platforms',
      'shopping',
      'llms.txt'
    ],
    h1Title: 'E-commerce & Retail',
    introText:
      'Modern e-commerce and retail platforms with llms.txt support. Create intelligent shopping experiences with AI-enhanced documentation.',
    faqQuestions: [
      {
        question: 'Why do e-commerce sites need llms.txt?',
        answer:
          'E-commerce platforms benefit from llms.txt by providing structured product and API documentation for AI-powered shopping assistants.'
      }
    ]
  },
  'content-media': {
    metaTitle: 'Content & Media Platforms with llms.txt | CMS & Publishing',
    metaDescription:
      'Publishing platforms, content management systems, and media tools with llms.txt. Access content solutions with AI-ready documentation.',
    keywords: [
      'content management',
      'CMS',
      'publishing platforms',
      'media tools',
      'digital content',
      'llms.txt'
    ],
    h1Title: 'Content & Media Platforms',
    introText:
      'Leading content and media platforms implementing llms.txt. Manage and publish content with AI-optimized documentation.',
    faqQuestions: [
      {
        question: 'How does llms.txt help content platforms?',
        answer:
          'Content platforms use llms.txt to provide structured documentation that helps AI assistants understand content APIs and publishing workflows.'
      }
    ]
  },
  'business-operations': {
    metaTitle: 'Business Operations Tools with llms.txt | Enterprise Solutions',
    metaDescription:
      'Business management, operations, and enterprise tools with llms.txt documentation. Streamline operations with AI-ready business solutions.',
    keywords: [
      'business operations',
      'enterprise tools',
      'business management',
      'ERP',
      'operations',
      'llms.txt'
    ],
    h1Title: 'Business Operations',
    introText:
      'Enterprise and business operation tools with llms.txt implementation. Optimize business processes with AI-enhanced documentation.',
    faqQuestions: [
      {
        question: 'What business tools support llms.txt?',
        answer:
          'Many enterprise resource planning (ERP) and business management platforms now include llms.txt for better AI integration.'
      }
    ]
  },
  personal: {
    metaTitle: 'Personal Websites & Portfolios with llms.txt',
    metaDescription:
      'Personal websites, portfolios, and blogs implementing llms.txt standard. Discover individual creators using AI-ready documentation.',
    keywords: [
      'personal websites',
      'portfolios',
      'blogs',
      'individual creators',
      'personal branding',
      'llms.txt'
    ],
    h1Title: 'Personal Sites & Portfolios',
    introText:
      'Individual creators and personal websites adopting llms.txt. Showcase your work with AI-friendly documentation.',
    faqQuestions: [
      {
        question: 'Why add llms.txt to a personal website?',
        answer:
          'Adding llms.txt to your personal site helps AI assistants better understand your work, making it easier for others to discover and interact with your content.'
      }
    ]
  },
  'agency-services': {
    metaTitle: 'Agencies & Service Providers with llms.txt',
    metaDescription:
      'Agencies, consultancies, and service providers with llms.txt documentation. Find professional services with AI-ready structured guides.',
    keywords: [
      'agencies',
      'consultancies',
      'service providers',
      'professional services',
      'consulting',
      'llms.txt'
    ],
    h1Title: 'Agencies & Services',
    introText:
      'Professional agencies and service providers implementing llms.txt. Connect with experts using AI-optimized documentation.',
    faqQuestions: [
      {
        question: 'How do agencies benefit from llms.txt?',
        answer:
          'Agencies use llms.txt to provide clear, structured documentation about their services, making it easier for AI assistants to understand and recommend their offerings.'
      }
    ]
  },
  international: {
    metaTitle: 'International Websites with llms.txt | Global & Multilingual',
    metaDescription:
      'Non-English and international websites with llms.txt documentation. Discover global platforms with AI-ready multilingual support.',
    keywords: [
      'international',
      'multilingual',
      'global websites',
      'non-English',
      'localization',
      'llms.txt'
    ],
    h1Title: 'International & Multilingual',
    introText:
      'Global and international platforms implementing llms.txt. Access worldwide resources with AI-friendly documentation in multiple languages.',
    faqQuestions: [
      {
        question: 'Does llms.txt support multiple languages?',
        answer:
          'Yes, llms.txt can be implemented in any language, making it valuable for international websites to provide AI-readable documentation globally.'
      }
    ]
  },
  other: {
    metaTitle: 'Other Websites & Tools with llms.txt Documentation',
    metaDescription:
      'Discover unique websites and tools implementing llms.txt standard. Find diverse platforms with AI-ready structured documentation.',
    keywords: [
      'other tools',
      'unique platforms',
      'diverse websites',
      'llms.txt',
      'AI documentation'
    ],
    h1Title: 'Other Platforms & Tools',
    introText:
      'Diverse websites and unique tools implementing llms.txt. Explore innovative platforms with AI-optimized documentation.',
    faqQuestions: [
      {
        question: 'What qualifies as "other" category?',
        answer:
          'The "other" category includes unique platforms and tools that don\'t fit traditional categories but still benefit from llms.txt documentation.'
      }
    ]
  }
}

// Helper function to get SEO content with fallback
export function getCategorySEO(slug: string, category: Category): CategorySEOConfig {
  const seoContent = categorySEOContent[slug]

  if (seoContent) {
    return seoContent
  }

  // Fallback for categories without specific SEO content
  return {
    metaTitle: `${category.name} with llms.txt Documentation`,
    metaDescription: `Discover ${category.name.toLowerCase()} implementing the llms.txt standard. ${category.description}`,
    keywords: [category.name.toLowerCase(), 'llms.txt', 'AI documentation', 'LLM integration'],
    h1Title: category.name,
    introText: category.description
  }
}
