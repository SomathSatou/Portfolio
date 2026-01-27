import type { Project } from './projects'

import { projects } from './projects'
import { teachingResearchProjects } from './teachingResearch'

export const allProjects: Project[] = [...projects, ...teachingResearchProjects]

export const projectBySlug: Record<string, Project> = Object.fromEntries(
  allProjects.map((p) => [p.slug, p]),
)
