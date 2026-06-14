import { describe, it, expect } from 'vitest'
import { projects, categories } from '../data/projects'
import { teachingResearchProjects, teachingResearchCategories } from '../data/teachingResearch'
import { allProjects, projectBySlug } from '../data/projectIndex'

// ---------------------------------------------------------------------------
// projects.ts
// ---------------------------------------------------------------------------

describe('projects data', () => {
  it('exports a non-empty projects array', () => {
    expect(projects.length).toBeGreaterThan(0)
  })

  it('every project has required fields', () => {
    for (const p of projects) {
      expect(p.slug).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.category).toBeTruthy()
      expect(p.description).toBeDefined()
    }
  })

  it('slugs are unique within projects', () => {
    const slugs = projects.map((p) => p.slug)
    const uniqueSlugs = new Set(slugs)
    expect(uniqueSlugs.size).toBe(slugs.length)
  })

  it('slug contains no uppercase letters', () => {
    for (const p of projects) {
      expect(p.slug).toBe(p.slug.toLowerCase())
    }
  })

  it('slug contains no diacritics', () => {
    for (const p of projects) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('slug does not start or end with a dash', () => {
    for (const p of projects) {
      expect(p.slug).not.toMatch(/^-/)
      expect(p.slug).not.toMatch(/-$/)
    }
  })

  it('github field is a valid URL when present', () => {
    for (const p of projects) {
      if (p.github) {
        expect(() => new URL(p.github!)).not.toThrow()
      }
    }
  })

  it('exports expected categories', () => {
    const names = categories.map((c) => c.name)
    expect(names).toContain('Traitement documentaire')
    expect(names).toContain('Jeux')
    expect(names).toContain('Web')
    expect(names).toContain('Automatisation')
    expect(names).toContain('Sécurité')
  })

  it('each category has at least one project slug', () => {
    for (const cat of categories) {
      expect(cat.projectSlugs.length).toBeGreaterThan(0)
    }
  })

  it('category project slugs reference existing projects', () => {
    const slugSet = new Set(projects.map((p) => p.slug))
    for (const cat of categories) {
      for (const slug of cat.projectSlugs) {
        expect(slugSet.has(slug)).toBe(true)
      }
    }
  })

  it('projects in a category match the category name', () => {
    for (const cat of categories) {
      for (const slug of cat.projectSlugs) {
        const p = projects.find((x) => x.slug === slug)
        expect(p?.category).toBe(cat.name)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// teachingResearch.ts
// ---------------------------------------------------------------------------

describe('teachingResearch data', () => {
  it('exports a non-empty teachingResearchProjects array', () => {
    expect(teachingResearchProjects.length).toBeGreaterThan(0)
  })

  it('every teaching project has required fields', () => {
    for (const p of teachingResearchProjects) {
      expect(p.slug).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.category).toBeTruthy()
      expect(p.description).toBeDefined()
    }
  })

  it('slugs are unique within teachingResearchProjects', () => {
    const slugs = teachingResearchProjects.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('slug is lowercase alphanumeric with dashes only', () => {
    for (const p of teachingResearchProjects) {
      expect(p.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('exports expected teaching/research categories', () => {
    const names = teachingResearchCategories.map((c) => c.name)
    expect(names).toContain('Recherche')
    expect(names).toContain('Formation')
    expect(names).toContain('Enseignement')
  })

  it('teaching category slugs reference existing teaching projects', () => {
    const slugSet = new Set(teachingResearchProjects.map((p) => p.slug))
    for (const cat of teachingResearchCategories) {
      for (const slug of cat.projectSlugs) {
        expect(slugSet.has(slug)).toBe(true)
      }
    }
  })

  it('teaching projects in a category match the category name', () => {
    for (const cat of teachingResearchCategories) {
      for (const slug of cat.projectSlugs) {
        const p = teachingResearchProjects.find((x) => x.slug === slug)
        expect(p?.category).toBe(cat.name)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// projectIndex.ts
// ---------------------------------------------------------------------------

describe('projectIndex', () => {
  it('allProjects is union of projects and teachingResearchProjects', () => {
    expect(allProjects.length).toBe(projects.length + teachingResearchProjects.length)
  })

  it('all projects appear in allProjects', () => {
    for (const p of projects) {
      expect(allProjects).toContainEqual(p)
    }
    for (const p of teachingResearchProjects) {
      expect(allProjects).toContainEqual(p)
    }
  })

  it('projectBySlug maps every slug to the correct project', () => {
    for (const p of allProjects) {
      expect(projectBySlug[p.slug]).toEqual(p)
    }
  })

  it('projectBySlug has the same count as allProjects', () => {
    expect(Object.keys(projectBySlug).length).toBe(allProjects.length)
  })

  it('unknown slug returns undefined from projectBySlug', () => {
    expect(projectBySlug['non-existent-slug-xyz']).toBeUndefined()
  })

  it('slugs in projectBySlug match expected format', () => {
    for (const slug of Object.keys(projectBySlug)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    }
  })
})
