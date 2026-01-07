// Knowledge file metadata and utilities

export interface KnowledgeFile {
  slug: string
  title: string
  description: string
  category: 'main' | 'projects' | 'learning' | 'tools' | 'personal'
  icon?: string
}

// Static list of knowledge files with metadata
export const KNOWLEDGE_FILES: KnowledgeFile[] = [
  {
    slug: 'main',
    title: 'Social Presence Hub',
    description: 'Main index and overview of all knowledge areas',
    category: 'main',
  },
  {
    slug: 'ai_sorcery',
    title: 'AI Sorcery',
    description: 'AI tools, agents, and automation workflows',
    category: 'tools',
  },
  {
    slug: 'tools',
    title: 'Tools & Technologies',
    description: 'Development tools and technology stack',
    category: 'tools',
  },
  {
    slug: 'deadlines',
    title: 'Deadlines & Opportunities',
    description: 'Important dates and upcoming opportunities',
    category: 'personal',
  },
  {
    slug: 'anticipated_projects',
    title: 'Anticipated Projects',
    description: 'Future project ideas and plans',
    category: 'projects',
  },
  {
    slug: 'comp_bio',
    title: 'Computational Biology',
    description: 'Bioinformatics and computational biology notes',
    category: 'learning',
  },
  {
    slug: 'job_desc',
    title: 'Job Descriptions',
    description: 'Career opportunities and job requirements',
    category: 'personal',
  },
  {
    slug: 'oreilly_courses',
    title: "O'Reilly Courses",
    description: 'Learning resources and course notes',
    category: 'learning',
  },
  {
    slug: 'URGENT',
    title: 'Urgent Items',
    description: 'High-priority tasks and reminders',
    category: 'personal',
  },
  {
    slug: 'digest',
    title: 'Digest',
    description: 'Curated content and summaries',
    category: 'learning',
  },
  {
    slug: 'github_learning',
    title: 'GitHub Learning',
    description: 'GitHub workflows and best practices',
    category: 'learning',
  },
  {
    slug: 'do_or_dda',
    title: 'Do or DDA',
    description: 'Action items and decisions',
    category: 'personal',
  },
  {
    slug: 'neovim_bindings',
    title: 'Neovim Bindings',
    description: 'Custom Neovim keybindings reference',
    category: 'tools',
  },
  {
    slug: 'preparations',
    title: 'Preparations',
    description: 'Preparation notes and checklists',
    category: 'personal',
  },
  {
    slug: 'ubuntu_stuff',
    title: 'Ubuntu Stuff',
    description: 'Ubuntu/Linux tips and configurations',
    category: 'tools',
  },
  {
    slug: 'CREDIT_CARD_BILLING',
    title: 'Credit Card Billing',
    description: 'Billing and payment tracking',
    category: 'personal',
  },
]

export const GITHUB_REPO_URL = 'https://github.com/divital-coder/social_presence'

export function getKnowledgeFile(slug: string): KnowledgeFile | undefined {
  return KNOWLEDGE_FILES.find((f) => f.slug === slug)
}

export function getGitHubFileUrl(slug: string): string {
  return `${GITHUB_REPO_URL}/blob/main/${slug}.md`
}

export function getGitHubEditUrl(slug: string): string {
  return `${GITHUB_REPO_URL}/edit/main/${slug}.md`
}

export async function fetchKnowledgeContent(slug: string): Promise<string> {
  const response = await fetch(`/knowledge/${slug}.md`)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${slug}.md`)
  }
  return response.text()
}

export const CATEGORY_LABELS: Record<KnowledgeFile['category'], string> = {
  main: 'Main',
  projects: 'Projects',
  learning: 'Learning',
  tools: 'Tools',
  personal: 'Personal',
}

export const CATEGORY_COLORS: Record<KnowledgeFile['category'], string> = {
  main: 'bg-blue-500/20 text-blue-400',
  projects: 'bg-purple-500/20 text-purple-400',
  learning: 'bg-green-500/20 text-green-400',
  tools: 'bg-orange-500/20 text-orange-400',
  personal: 'bg-pink-500/20 text-pink-400',
}
