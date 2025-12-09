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
  github: extra.github ?? 'https://github.com/SomathSatou',
  image: extra.image,
})

const DescriptionExtractDoc: string = 'De nos jours, l\'extraction d\'informations documentaires est un domaine clé utilisé dans de nombreux secteurs, notamment dans l\'industrie et les services financiers. j\'ai eu l\'occasion de travailler sur cette problématique durant  <a href="https://theses.hal.science/tel-05004226/document" target="_blank" rel="noreferrer">ma thèse</a> .'
    + '<br /><br />L\'objectif de ce projet était d\'implémenter une solution complète pour l\'extraction automatique des informations clés des documents, nottament des factures, des analyse de laboratoire et des fiches suiveuse.</strong>'
    + '<br /><br />En s\'appuyant sur des techniques de reconaissance de motifs dans des graphes enrichie avec des technique de reconaissance visuel dans les document nous sommes parvenus a extraire éfficacement des tableaux des documents traités.'
    + '<br /><br />Nous avons explorer un concept récurent dans l\'extraction des informations dans les documents un processus Extract Transform Load (ETL), que nous avons décomposer en plusieurs étapes s\'accordant avec notre besoin d\'extraire des informations des documents et le traitement de documents qui ne sont pas forcément nativement des documents numériques.'
    + '<br /><br /><figure><img src="/assets/DataExtraction.png" alt="Exemple d\'extraction" class="w-full h-auto rounded-lg shadow-md" style="max-width: 800px; margin: 0 auto;" /><figcaption>Processus Extract Transform Load (ETL)</figcaption></figure>'
    + 'Nos travaux se sont principalement concentré sur la partie Transform, ainsi nous avons implémenter un moteur a base de règle pour étiqueter les informations extraites des documents, cea nous positionne dans le domaine appelé Named Entity Recognition (NER).'
    + '<br /><br />Cette solution a été développée dans le cadre d\'un projet de recherche collaboratif avec l\'équipe du LERIA de l\'université d\'Angers et l\'entreprise KS2.';

export const projects: Project[] = [
  // Traitements documentaires 
  P('Extraction d\'information documentaire', 'Traitement documentaire', { 
    tags: ["TALN", "Traitement de texte", "Reconnaissance visuelle", "Graphes", "Analyse de documents"], 
    description: DescriptionExtractDoc 
  }),
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
