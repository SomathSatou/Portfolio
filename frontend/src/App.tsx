import React from 'react'
import Layout from './components/Layout'
import JdrRouter from './components/Jdr/JdrRouter'
import MuscuRouter from './components/Muscu/MuscuRouter'
import HubPerso from './components/HubPerso'
import HubAccountPage from './components/HubAccountPage'
import { Badge, Button, Card, Input, SectionTitle, TextArea, useReveal } from './components/ui'
import { categories as projectCategories } from './data/projects'
import { projectBySlug } from './data/projectIndex'
import { teachingResearchCategories } from './data/teachingResearch'

const heroSkills = ['Python', 'Java', 'C++', 'React', 'Django', 'CI/CD', 'API', 'TALN']

function SectionCV() {
  return (
    <section id="cv" className="hero-blobs">
      <div className="section flex flex-col items-center text-center gap-6 animate-fadeIn">
        <div className="relative inline-block">
          <div className="avatar-ring" />
          <img
            src="/assets/avatar.jpg"
            alt="Avatar"
            className="relative w-40 h-40 md:w-80 md:h-80 rounded-full object-cover ring-4 ring-white/80 dark:ring-gray-900/80 shadow-xl"
          />
        </div>
        <div className="max-w-3xl animate-slideUp">
          <h1 className="text-3xl md:text-5xl font-bold">
            <span className="text-gradient">Développeur logiciel et web</span>
          </h1>
          <div className="mt-4 flex flex-wrap justify-center gap-2 stagger-children">
            {heroSkills.map((skill) => (
              <Badge key={skill} className="animate-scaleIn">{skill}</Badge>
            ))}
          </div>
          <p className="mt-5 text-base leading-relaxed text-justify">
            Développeur logiciel et web, j'évolue à l'interface entre recherche, ingénierie et applications métiers. 
            Je m'appuie sur une veille technologique continue pour sélectionner les outils, frameworks et architectures 
            les plus pertinents, puis les transformer en solutions logicielles robustes, performantes et maintenables. 
            Mon expérience couvre le développement backend (Java, Python, C++), le développement web (frameworks frontend modernes), 
            ainsi que la conception d'API, l'intégration continue, le déploiement et l'industrialisation des applications. 
            Sensible à la qualité du code et aux bonnes pratiques, je privilégie des solutions fiables, évolutives et adaptées aux usages 
            réels, en lien étroit avec les besoins métier. </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button href="/assets/cv.pdf" variant="primary" download className="hover-lift">
              Télécharger le CV
            </Button>
            <Button href="#projects" variant="outline" className="hover-lift">
              Voir les projets
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

type CategoryLike = { name: string; projectSlugs: string[] }

function CategoryGrid({ categories }: { categories: CategoryLike[] }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="reveal mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
      {categories.map((cat, index) => (
        <Card
          key={cat.name}
          variant="bento"
          className={`animate-slideUp group flex flex-col ${index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full" style={{ background: 'linear-gradient(to bottom, var(--color-primary), var(--color-accent3))' }} />
            <h3 className="font-semibold text-lg text-primary">{cat.name}</h3>
          </div>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 space-y-1 flex-1">
            {cat.projectSlugs.map((slug) => {
              const p = projectBySlug[slug]
              /* istanbul ignore next */
              if (!p) return null
              return (
                <li key={slug}>
                  <a href={`#/project/${slug}`} className="hover:underline">
                    {p.title}
                  </a>
                  {p.tags && p.tags.length > 0 && (
                    <span className="ml-2 hidden lg:inline-flex flex-wrap gap-1 align-middle">
                      {p.tags.slice(0, 2).map((t) => (
                        <Badge key={t} className="!text-[0.65rem]">{t}</Badge>
                      ))}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {cat.projectSlugs.length > 0 && (
            <div className="mt-4">
              <Button href={`#/project/${cat.projectSlugs[0]}`} variant="accent" className="opacity-90 group-hover:opacity-100">
                Voir un exemple
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function SectionProjects() {
  return (
    <section id="projects">
      <div className="section animate-fadeIn">
        <SectionTitle title="Projets" subtitle="Un aperçu de mes travaux et domaines d’expertise." />
        <CategoryGrid categories={projectCategories} />
      </div>
    </section>
  )
}

function SectionTeachingResearch() {
  return (
    <section id="teaching-research">
      <div className="section animate-fadeIn">
        <SectionTitle title="Enseignement et Recherche" subtitle="Travaux académiques, publications et supports liés à la formation." />
        <CategoryGrid categories={teachingResearchCategories} />
      </div>
    </section>
  )
}



function SectionContact() {
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [resultMessage, setResultMessage] = React.useState<string>('')
  const [resultOk, setResultOk] = React.useState<boolean | null>(null)
  // Honeypot field (hidden)
  const [hp, setHp] = React.useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResultMessage('Envoi…')
    setResultOk(null)
    if (!name || !email || !message) {
      setResultMessage('Veuillez remplir tous les champs.')
      setResultOk(false)
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
      setResultMessage('Message envoyé. Merci !')
      setResultOk(true)
      setName(''); setEmail(''); setMessage('')
    } catch {
      setResultMessage("Échec de l’envoi. Réessayez.")
      setResultOk(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact">
      <div className="section animate-fadeIn">
        <SectionTitle title="Contact" subtitle="Envoyez-moi un message, je vous répondrai rapidement." />

        <form onSubmit={onSubmit} className="mt-6 card-glass p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
          </div>
          <div className="sm:col-span-1">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votremail@example.com" />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Votre message" />
          </div>
          {/* Honeypot field (should stay empty) */}
          <input type="text" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <div className="sm:col-span-2 flex items-center justify-between">
            <span className={`text-xs ${resultOk === true ? 'text-green-700' : resultOk === false ? 'text-red-700' : 'text-gray-500'}`}>{resultMessage}</span>
            <Button disabled={loading} type="submit" variant="accent" className="hover-lift">
              {loading ? 'Envoi…' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  )
}

function Home({ scrollTo }: { scrollTo?: 'cv' | 'projects' | 'teaching-research' | 'contact' }) {
  React.useEffect(() => {
    if (!scrollTo) return
    // Scroll after render
    const id = scrollTo
    const el = document.getElementById(id)
    /* istanbul ignore next */
    if (el) {
      // small timeout to ensure layout is painted
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
  }, [scrollTo])

  return (
    <>
      <SectionCV />
      <SectionProjects />
      <SectionTeachingResearch />
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
      <div className="section animate-fadeIn">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <a href="#/" className="hover:underline">Accueil</a>
          <span className="mx-2">/</span>
          <a href="#/projects" className="hover:underline">Projets</a>
          <span className="mx-2">/</span>
          <span>{project.title}</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 animate-slideUp">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">{project.title}</h1>
            <div className="mt-4 prose">
              {project.description}
            </div>
          </div>
          <aside className="card-glass animate-slideInRight lg:sticky lg:top-24 self-start">
            {/* istanbul ignore next */}
            {project.image && (
              <div className="overflow-hidden rounded-md mb-4">
                <img src={project.image} alt={project.title} className="w-full transition-transform duration-500 hover:scale-105" />
              </div>
            )}
            {/* istanbul ignore next */}
            {project.tags && project.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {project.tags.map((t: string) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
            )}
            {project.github && (
              <Button href={project.github} target="_blank" rel="noreferrer" variant="outline" className="hover-lift">
                Voir sur GitHub
              </Button>
            )}
          </aside>
        </div>
      </div>
    </section>
  )

}

export default function App() {
  const [hash, setHash] = React.useState<string>(/* v8 ignore next */ () => window.location.hash || '#/')

  React.useEffect(() => {
    const onHashChange = /* v8 ignore next */ () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return /* v8 ignore next */ () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Hub Perso — gateway to apps
  if (hash === '#/perso') {
    return <HubPerso />
  }
  if (hash === '#/perso/account') {
    return <HubAccountPage />
  }

  // IRL RPG routes — rendered outside of the portfolio Layout
  if (hash.startsWith('#/irlrpg')) {
    return <div className="theme-irlrpg"><MuscuRouter hash={hash} /></div>
  }

  // JDR routes — rendered outside of the portfolio Layout
  if (hash.startsWith('#/jdr')) {
    return <div className="theme-jdr"><JdrRouter hash={hash} /></div>
  }

  // Simple hash router: #/ for home, #/project/:slug for project page
  let view: React.ReactNode = null
  const match = hash.match(/^#\/project\/([^#/?]+)/)
  if (match) {
    view = <ProjectPage slug={match[1]} />
  } else {
    // support #/cv, #/projects, #/contact for direct section links
    let scrollTo: 'cv' | 'projects' | 'teaching-research' | 'contact' | undefined
    if (hash === '#/cv') scrollTo = 'cv'
    else if (hash === '#/projects') scrollTo = 'projects'
    else if (hash === '#/teaching-research') scrollTo = 'teaching-research'
    else if (hash === '#/contact') scrollTo = 'contact'
    view = <Home scrollTo={scrollTo} />
  }

  return <Layout>{view}</Layout>
}

