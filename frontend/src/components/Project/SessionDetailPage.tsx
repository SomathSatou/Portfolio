import { Button } from '../ui'
import { projectBySlug } from '../../data/projectIndex'

interface SessionDetailPageProps {
  slug: string
  sessionId: string
}

export default function SessionDetailPage({ slug, sessionId }: SessionDetailPageProps) {
  const project = projectBySlug[slug]
  const session = project?.sessions?.find((s) => s.id === sessionId)

  if (!project || !session) {
    return (
      <section>
        <div className="section">
          <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <a href="#/" className="hover:underline">Accueil</a>
            <span className="mx-2">/</span>
            <span>Séance</span>
          </nav>
          <h1 className="text-2xl font-semibold text-primary">Séance introuvable</h1>
          <p className="mt-3 text-gray-700 dark:text-gray-300">
            Cette séance n'existe pas ou a été déplacée.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="section animate-fadeIn">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <a href="#/" className="hover:underline">Accueil</a>
          <span className="mx-2">/</span>
          <a href={`#/project/${project.slug}`} className="hover:underline">{project.title}</a>
          <span className="mx-2">/</span>
          <span>{session.title}</span>
        </nav>

        <h1 className="text-2xl md:text-3xl font-bold text-primary">{session.title}</h1>
        {session.duration && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{session.duration}</p>
        )}

        <div className="mt-6 prose">{session.description}</div>
        {session.content && <div className="mt-6 prose">{session.content}</div>}

        <div className="mt-8">
          <Button href={`#/project/${project.slug}`} variant="outline" className="hover-lift">
            Retour au cours
          </Button>
        </div>
      </div>
    </section>
  )
}
