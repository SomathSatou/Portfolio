import React from 'react'
import Layout from './components/Layout'
import { categories, projectBySlug } from './data/projects'

function SectionCV() {
  return (
    <section id="cv">
      <div className="section flex flex-col items-center text-center gap-6">
        <img
          src="/assets/avatar.jpg"
          alt="Avatar"
          className="w-80 h-80 md:w-80 md:h-80 rounded-full object-cover ring-4 ring-primaryLight/60 shadow-lg"
        />
        <div className="max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-primary">Développeur polyvalent</h1>
          <p className="mt-4 text-base leading-relaxed">
            Développeur polyvalent, je m’appuie sur une veille technologique active pour identifier les outils et frameworks les plus adaptés,
            puis les transformer en solutions logicielles concrètes et efficaces. Mon expérience couvre backend (Java, Python, C++) et frontend
            (frameworks modernes), CI/CD et architectures robustes. Qualité du code, maintenabilité et performance sont au cœur de mes pratiques.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/assets/cv.pdf"
              className="btn btn-primary"
              download
            >
              Télécharger le CV
            </a>
            <a
              href="#projects"
              className="btn btn-outline"
            >
              Voir les projets
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

 function SectionProjects() {
  return (
    <section id="projects">
      <div className="section">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">Projets</h2>
        <p className="mt-2 text-gray-600">Un aperçu de mes travaux et domaines d’expertise.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div key={cat.name} className="card">
              <h3 className="font-semibold text-lg text-primary">{cat.name}</h3>
              <ul className="mt-3 list-disc pl-5 text-sm text-gray-700">
                {cat.projectSlugs.map((slug) => {
                  const p = projectBySlug[slug]
                  if (!p) return null
                  return (
                    <li key={slug}>
                      <a href={`#/project/${slug}`} className="hover:underline">
                        {p.title}
                      </a>
                    </li>
                  )
                })}
              </ul>
              {cat.projectSlugs.length > 0 && (
                <a href={`#/project/${cat.projectSlugs[0]}`} className="mt-4 inline-block btn btn-accent">
                  Voir un exemple
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function SectionContact() {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<null | { ok: boolean; text: string }>(null)
  // Honeypot field (hidden)
  const [hp, setHp] = React.useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus(null)
    if (!name || !email || !message) {
      setStatus({ ok: false, text: 'Veuillez remplir tous les champs.' })
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, honeypot: hp }),
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setStatus({ ok: true, text: 'Message envoyé. Merci !' })
      setName(''); setEmail(''); setMessage('')
    } catch {
      setStatus({ ok: false, text: "Échec de l’envoi. Réessayez." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact">
      <div className="section">
        <h2 className="text-2xl md:text-3xl font-bold text-primary">Contact</h2>
        <p className="mt-2 text-gray-600">Envoyez-moi un message, je vous répondrai rapidement.</p>

        <form onSubmit={onSubmit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Votre nom" />
          </div>
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="votremail@example.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Message</label>
            <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Votre message"></textarea>
          </div>
          {/* Honeypot field (should stay empty) */}
          <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div className="sm:col-span-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Les messages sont envoyés côté serveur (dev: console).</span>
            <button disabled={loading} type="submit" className="btn btn-accent">
              {loading ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
          {status && (
            <div className={`sm:col-span-2 text-sm ${status.ok ? 'text-green-700' : 'text-red-700'}`}>{status.text}</div>
          )}
        </form>
      </div>
    </section>
  )
}

function Home({ scrollTo }: { scrollTo?: 'cv' | 'projects' | 'contact' }) {
  React.useEffect(() => {
    if (!scrollTo) return
    // Scroll after render
    const id = scrollTo
    const el = document.getElementById(id)
    if (el) {
      // small timeout to ensure layout is painted
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
  }, [scrollTo])

  return (
    <>
      <SectionCV />
      <SectionProjects />
      <SectionContact />
    </>
  )
}

function ProjectPage({ slug }: { slug: string }) {
  const project = projectBySlug[slug]
  if (!project) {
    return (
      <section>
        <div className="section">
          <nav className="text-sm text-gray-500 mb-4">
            <a href="#/" className="hover:underline">Accueil</a>
            <span className="mx-2">/</span>
            <span>Projet</span>
          </nav>
          <h1 className="text-2xl font-semibold text-primary">Projet introuvable</h1>
          <p className="mt-3 text-gray-700">Ce projet n'existe pas ou a été déplacé.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="section">
        <nav className="text-sm text-gray-500 mb-4">
          <a href="#/" className="hover:underline">Accueil</a>
          <span className="mx-2">/</span>
          <a href="#/projects" className="hover:underline">Projets</a>
          <span className="mx-2">/</span>
          <span>{project.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h1 className="text-3xl font-bold text-primary">{project.title}</h1>
            <div
              className="mt-4 text-gray-700 space-y-4"
              dangerouslySetInnerHTML={{ __html: project.description }}
            />
          </div>
          <aside className="card">
            {project.image && (
              <img src={project.image} alt={project.title} className="w-full rounded-md mb-4" />
            )}
            {project.tags && project.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {project.tags.map((t) => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </div>
            )}
            {project.github && (
              <a href={project.github} target="_blank" rel="noreferrer" className="btn btn-outline">Voir sur GitHub</a>
            )}
          </aside>
        </div>
      </div>
    </section>
  )

}

export default function App() {
  const [hash, setHash] = React.useState<string>(() => window.location.hash || '#/')

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Simple hash router: #/ for home, #/project/:slug for project page
  let view: React.ReactNode = null
  const match = hash.match(/^#\/project\/([^#/?]+)/)
  if (match) {
    view = <ProjectPage slug={match[1]} />
  } else {
    // support #/cv, #/projects, #/contact for direct section links
    let scrollTo: 'cv' | 'projects' | 'contact' | undefined
    if (hash === '#/cv') scrollTo = 'cv'
    else if (hash === '#/projects') scrollTo = 'projects'
    else if (hash === '#/contact') scrollTo = 'contact'
    view = <Home scrollTo={scrollTo} />
  }

  return <Layout>{view}</Layout>
}

