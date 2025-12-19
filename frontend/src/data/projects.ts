import type { ReactNode } from 'react'
import { DescriptionExtractDoc } from '../components/Project/DescriptionExtractDoc';
import { DescFullMetalWar } from '../components/Project/DescFullMetalWar';

export type Project = {
  slug: string
  title: string
  description: ReactNode
  category: string
  tags?: string[]
  github?: string
  image?: string
}

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
  description: extra.description ?? 'Description à venir.'
  ,
  category,
  tags: extra.tags,
  github: extra.github ?? 'https://github.com/SomathSatou',
  image: extra.image,
})

export const projects: Project[] = [
  // Traitements documentaires 
  P('Extraction d\'information documentaire', 'Traitement documentaire', { 
    tags: ["TALN", "Traitement de texte", "Reconnaissance visuelle", "Graphes", "Analyse de documents"], 
    description: DescriptionExtractDoc()
  }),
  P('Génération de documents', 'Traitement documentaire'),
  P('LLM & NLP', 'Traitement documentaire'),

  // Jeux
  P('ALFI (ludique)', 'Jeux'),
  P('MechaIDLE', 'Jeux'),
  P('FullMetalWar', 'Jeux', { 
    tags: ["IA", "Stratégie", "Jeux"],
    description: DescFullMetalWar() }),

  // Web
  P('Projet à définir (Java, Laravel, TailwindCSS)', 'Web'),
  P('Infoscope (Django + React)', 'Web'),

  // Recherche
  P('ICTAI 2024', 'Recherche'),
  P('Overview', 'Recherche'),

  // Automatisation
  P('N8N', 'Automatisation'),

  // Formation
  P('Vercel', 'Formation'),
  P('Supabase', 'Formation'),
  P('OpenRouter', 'Formation'),

  // Sécurité
  P('Audit', 'Sécurité'),
]

export const projectBySlug: Record<string, Project> = Object.fromEntries(
  projects.map((p) => [p.slug, p]),
)

export type Category = {
  name: string
  projectSlugs: string[]
}

export const categories: Category[] = [
  { name: 'Traitement documentaire', projectSlugs: projects.filter(p => p.category === 'Traitement documentaire').map(p => p.slug) },
  { name: 'Jeux', projectSlugs: projects.filter(p => p.category === 'Jeux').map(p => p.slug) },
  { name: 'Web', projectSlugs: projects.filter(p => p.category === 'Web').map(p => p.slug) },
  { name: 'Recherche', projectSlugs: projects.filter(p => p.category === 'Recherche').map(p => p.slug) },
  { name: 'Automatisation', projectSlugs: projects.filter(p => p.category === 'Automatisation').map(p => p.slug) },
  { name: 'Formation', projectSlugs: projects.filter(p => p.category === 'Formation').map(p => p.slug) },
  { name: 'Sécurité', projectSlugs: projects.filter(p => p.category === 'Sécurité').map(p => p.slug) },
]
