export type Project = {
  slug: string
  title: string
  description: string
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
  github: extra.github,
  image: extra.image,
})

export const projects: Project[] = [
  // Traitement documentaire
  P('Extraction de documents', 'Traitement documentaire'),
  P('Génération de documents', 'Traitement documentaire'),
  P('LLM & NLP', 'Traitement documentaire'),

  // Jeux
  P('ALFI (ludique)', 'Jeux'),
  P('MechaIDLE', 'Jeux'),

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
