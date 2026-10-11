import type { ReactNode } from 'react'
import { DescriptionExtractDoc } from '../components/Project/DescriptionExtractDoc';
import { DescFullMetalWar } from '../components/Project/DescFullMetalWar';
import { DescInfoscope } from '../components/Project/DescInfoscope';
import { DescGenerationDoc } from '../components/Project/DescGenerationDoc';
import { DescLlmNlp } from '../components/Project/DescLlmNlp';
import { DescAlfi } from '../components/Project/DescAlfi';
import { DescMechaIdle } from '../components/Project/DescMechaIdle';
import { DescIdleOne } from '../components/Project/DescIdleOne';
import { DescJdr } from '../components/Project/DescJdr';
import { DescIrlRpg } from '../components/Project/DescIrlRpg';
import { DescN8n } from '../components/Project/DescN8n';
import { DescAudit } from '../components/Project/DescAudit';

export type Session = {
  id: string
  title: string
  description: ReactNode
  content?: ReactNode
  duration?: string
}

export type Project = {
  slug: string
  title: string
  description: ReactNode
  category: string
  tags?: string[]
  github?: string
  link?: string
  status?: 'en-cours' | 'en-pause'
  image?: string
  sessions?: Session[]
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
  link: extra.link,
  status: extra.status,
  image: extra.image,
  sessions: extra.sessions,
})

export const projects: Project[] = [
  // Traitements documentaires 
  P('Extraction d\'information documentaire', 'Traitement documentaire', { 
    tags: ["TALN", "Traitement de texte", "Reconnaissance visuelle", "Graphes", "Analyse de documents"], 
    description: DescriptionExtractDoc()
  }),
  P('Génération de documents', 'Traitement documentaire', {
    description: DescGenerationDoc()
  }),
  P('LLM & NLP', 'Traitement documentaire', {
    tags: ["LLM", "TALN", "RAG", "Agents conversationnels"],
    description: DescLlmNlp()
  }),

  // Jeux
  P('ALFI (ludique)', 'Jeux', {
    tags: ["Serious game", "VR", "AR", "Formation"],
    description: DescAlfi()
  }),
  P('MechaIDLE', 'Jeux', {
    tags: ["Unity", "C#", "RPG", "Idle"],
    description: DescMechaIdle(),
    status: 'en-pause',
  }),
  P('IdleOne', 'Jeux', {
    tags: ["Unity", "C#", "Idle", "Breeding", "Agents IA"],
    description: DescIdleOne(),
    github: 'https://github.com/SomathSatou/IdleOne',
    status: 'en-cours',
  }),
  P('FullMetalWar', 'Jeux', { 
    tags: ["IA", "Stratégie", "Jeux", "C++"],
    description: DescFullMetalWar(),
    github: 'https://github.com/SomathSatou/FullMetalWar'
  }),

  // Web
  P('JDR — Le Monde de Lug', 'Web', {
    slug: 'jdr-le-monde-de-lug',
    tags: ["Django", "React", "WebSockets", "Temps réel", "Jeu de rôle"],
    description: DescJdr(),
    github: 'https://github.com/SomathSatou/Portfolio',
    link: '#/jdr',
    status: 'en-cours',
  }),
  P('IRL RPG', 'Web', {
    slug: 'irl-rpg',
    tags: ["Django", "React", "Gamification", "Sport"],
    description: DescIrlRpg(),
    github: 'https://github.com/SomathSatou/Portfolio',
    link: '#/irlrpg',
    status: 'en-cours',
  }),
  P('Infoscope (Django + React)', 'Web', {
    tags: ["Django", "React", "WordPress Migration", "Média", "CMS"],
    description: DescInfoscope(),
    status: 'en-cours',
  }),

  // Automatisation
  P('N8N', 'Automatisation', {
    tags: ["n8n", "Workflows", "Mailing", "Self-hosted"],
    description: DescN8n()
  }),

  // Sécurité
  P('Audit', 'Sécurité', {
    tags: ["Lynis", "Nmap", "Nikto", "CIS", "TLS"],
    description: DescAudit()
  }),
]

export type Category = {
  name: string
  projectSlugs: string[]
}

export const categories: Category[] = [
  { name: 'Traitement documentaire', projectSlugs: projects.filter(p => p.category === 'Traitement documentaire').map(p => p.slug) },
  { name: 'Jeux', projectSlugs: projects.filter(p => p.category === 'Jeux').map(p => p.slug) },
  { name: 'Web', projectSlugs: projects.filter(p => p.category === 'Web').map(p => p.slug) },
  { name: 'Automatisation', projectSlugs: projects.filter(p => p.category === 'Automatisation').map(p => p.slug) },
  { name: 'Sécurité', projectSlugs: projects.filter(p => p.category === 'Sécurité').map(p => p.slug) },
]
