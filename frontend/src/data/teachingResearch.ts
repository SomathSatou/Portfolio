import type { ReactNode } from 'react'
import type { Category, Project } from './projects'

import { DescICTAI2024 } from '../components/Project/DescICTAI2024'
import { DescOverview } from '../components/Project/DescOverview'

function toSlug(label: string) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const P = (title: string, category: string, extra: Partial<Project> = {}): Project => ({
  slug: extra.slug ?? toSlug(title),
  title,
  description: (extra.description ?? 'Description à venir.') as ReactNode,
  category,
  tags: extra.tags,
  github: extra.github ?? 'https://github.com/SomathSatou',
  image: extra.image,
})

export const teachingResearchProjects: Project[] = [
  // Recherche
  P('ICTAI 2024', 'Recherche', {
    tags: ['IEEE', 'Conférence', 'Extraction de tableaux', 'Vision par ordinateur', 'Graphes'],
    description: DescICTAI2024(),
  }),
  P('Overview', 'Recherche', {
    tags: ['IEEE Access', "État de l'art", 'Extraction de données', 'Factures', 'Survey'],
    description: DescOverview(),
  }),

  // Formation
  P('Vercel', 'Formation'),
  P('Supabase', 'Formation'),
  P('OpenRouter', 'Formation'),

  P('Computer Vision', 'Enseignement')
]

export const teachingResearchCategories: Category[] = [
  {
    name: 'Recherche',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Recherche')
      .map((p) => p.slug),
  },
  {
    name: 'Formation',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Formation')
      .map((p) => p.slug),
  },
  {
    name: 'Enseignement',
    projectSlugs: teachingResearchProjects
      .filter((p) => p.category === 'Enseignement')
      .map((p) => p.slug),
  }
]
