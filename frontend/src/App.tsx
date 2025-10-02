import React from 'react'

function Header() {
  const [dark, setDark] = React.useState<boolean>(document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const root = document.documentElement
    const next = !dark
    if (next) {
      root.classList.add('dark')
      try { localStorage.setItem('theme', 'dark') } catch { /* ignore storage errors */ }
    } else {
      root.classList.remove('dark')
      try { localStorage.setItem('theme', 'light') } catch { /* ignore storage errors */ }
    }
    setDark(next)
  }

  return (
    <header className="sticky top-0 z-50 bg-primary text-white shadow">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <a href="#cv" className="font-semibold tracking-wide">Thomas Saout</a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#cv" className="hover:text-accent3 transition-colors">CV</a>
          <a href="#projects" className="hover:text-accent3 transition-colors">Projets</a>
          <a href="#contact" className="hover:text-accent3 transition-colors">Contact</a>
          {/* TODO: Add language switch FR/EN with i18n */}
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-medium tracking-wide"
            aria-label="Basculer le thème"
            title="Basculer le thème"
          >
            {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </nav>
      </div>
    </header>
  )
}

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
  const categories = [
    {
      name: 'Traitement documentaire',
      items: ['Extraction de documents', 'Génération de documents', 'LLM & NLP'],
    },
    {
      name: 'Jeux',
      items: ['ALFI (ludique)', 'MechaIDLE'],
    },
    {
      name: 'Web',
      items: ['Projet à définir (Java, Laravel, TailwindCSS)', 'Infoscope (Django + React)'],
    },
    {
      name: 'Recherche',
      items: ['ICTAI 2024', 'Overview'],
    },
    {
      name: 'Automatisation',
      items: ['N8N'],
    },
    {
      name: 'Formation',
      items: ['Vercel', 'Supabase', 'OpenRouter'],
    },
    {
      name: 'Sécurité',
      items: ['Audit'],
    },
  ]

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
                {cat.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button className="mt-4 btn btn-accent">
                Voir un exemple
              </button>
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

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <SectionCV />
        <SectionProjects />
        <SectionContact />
      </main>
      <footer className="border-t bg-white dark:bg-gray-900 dark:border-gray-800">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-gray-600 dark:text-gray-400 flex items-center justify-between">
          <span>© {new Date().getFullYear()} Thomas Saout</span>
          <span className="text-gray-400">FR/EN bientôt • Django + React</span>
        </div>
      </footer>
    </div>
  )
}

