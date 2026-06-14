import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'

// Stub heavy components to isolate App routing logic
vi.mock('../components/Jdr/JdrRouter', () => ({ default: () => <div data-testid="jdr-router" /> }))
vi.mock('../components/Muscu/MuscuRouter', () => ({ default: () => <div data-testid="muscu-router" /> }))
vi.mock('../components/HubPerso', () => ({ default: () => <div data-testid="hub-perso" /> }))

// Helper: set window.location.hash and trigger hashchange
function setHash(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('App router', () => {
  beforeEach(() => {
    window.location.hash = '#/'
  })

  it('renders home page at #/', () => {
    window.location.hash = '#/'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('renders HubPerso at #/perso', () => {
    window.location.hash = '#/perso'
    render(<App />)
    expect(screen.getByTestId('hub-perso')).toBeInTheDocument()
  })

  it('renders MuscuRouter at #/irlrpg', () => {
    window.location.hash = '#/irlrpg'
    render(<App />)
    expect(screen.getByTestId('muscu-router')).toBeInTheDocument()
  })

  it('renders MuscuRouter at #/irlrpg/something', () => {
    window.location.hash = '#/irlrpg/dashboard'
    render(<App />)
    expect(screen.getByTestId('muscu-router')).toBeInTheDocument()
  })

  it('renders JdrRouter at #/jdr', () => {
    window.location.hash = '#/jdr'
    render(<App />)
    expect(screen.getByTestId('jdr-router')).toBeInTheDocument()
  })

  it('renders JdrRouter at #/jdr/something', () => {
    window.location.hash = '#/jdr/campagne'
    render(<App />)
    expect(screen.getByTestId('jdr-router')).toBeInTheDocument()
  })

  it('renders project page at #/project/:slug for known slug', () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'FullMetalWar' })).toBeInTheDocument()
  })

  it('renders 404 for unknown project slug', () => {
    window.location.hash = '#/project/unknown-slug-xyz-999'
    render(<App />)
    expect(screen.getByText('Projet introuvable')).toBeInTheDocument()
  })

  it('renders home when hash is unknown (e.g. #/about)', () => {
    window.location.hash = '#/about'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('updates view on hashchange to project page', async () => {
    window.location.hash = '#/'
    render(<App />)
    setHash('#/project/fullmetalwar')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'FullMetalWar' })).toBeInTheDocument()
    })
  })

  it('updates view on hashchange back to home', async () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    setHash('#/')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// Home scrollTo branches
// ---------------------------------------------------------------------------

describe('Home scrollTo', () => {
  it('renders home at #/cv', () => {
    window.location.hash = '#/cv'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('renders home at #/projects', () => {
    window.location.hash = '#/projects'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('renders home at #/teaching-research', () => {
    window.location.hash = '#/teaching-research'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('renders home at #/contact', () => {
    window.location.hash = '#/contact'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Développeur logiciel et web' })).toBeInTheDocument()
  })

  it('calls scrollIntoView when scrollTo target element exists', async () => {
    window.location.hash = '#/cv'
    const mockScrollIntoView = vi.fn()
    // Create a real DOM element that getElementById will find
    const el = document.createElement('section')
    el.id = 'cv'
    el.scrollIntoView = mockScrollIntoView
    document.body.appendChild(el)
    render(<App />)
    // Wait for the setTimeout(0) inside the effect
    await new Promise((r) => setTimeout(r, 50))
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    document.body.removeChild(el)
  })
})

// ---------------------------------------------------------------------------
// SectionContact form logic
// ---------------------------------------------------------------------------

describe('SectionContact', () => {
  beforeEach(() => {
    window.location.hash = '#/'
    vi.restoreAllMocks()
  })

  it('renders contact form fields', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('Votre nom')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('votremail@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Votre message')).toBeInTheDocument()
  })

  it('renders submit button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeInTheDocument()
  })

  it('shows validation error when fields are empty', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByText('Veuillez remplir tous les champs.')).toBeInTheDocument()
    })
  })

  it('shows success message on successful submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Votre nom'), { target: { value: 'Alice' } })
    fireEvent.change(screen.getByPlaceholderText('votremail@example.com'), { target: { value: 'alice@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Votre message'), { target: { value: 'Hello!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByText('Message envoyé. Merci !')).toBeInTheDocument()
    })
  })

  it('shows error message on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Votre nom'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByPlaceholderText('votremail@example.com'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Votre message'), { target: { value: 'Hi' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByText(/envoi.*essayez/i)).toBeInTheDocument()
    })
  })

  it('shows error when server returns non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Votre nom'), { target: { value: 'Carol' } })
    fireEvent.change(screen.getByPlaceholderText('votremail@example.com'), { target: { value: 'carol@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Votre message'), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByText(/envoi.*essayez/i)).toBeInTheDocument()
    })
  })

  it('clears form fields after successful submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<App />)
    const nameInput = screen.getByPlaceholderText('Votre nom') as HTMLInputElement
    const emailInput = screen.getByPlaceholderText('votremail@example.com') as HTMLInputElement
    const messageInput = screen.getByPlaceholderText('Votre message') as HTMLTextAreaElement
    fireEvent.change(nameInput, { target: { value: 'Alice' } })
    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } })
    fireEvent.change(messageInput, { target: { value: 'Coucou' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(nameInput.value).toBe('')
      expect(emailInput.value).toBe('')
      expect(messageInput.value).toBe('')
    })
  })

  it('honeypot field onChange updates state without blocking submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
    render(<App />)
    // The honeypot input is hidden but still in the DOM
    const honeypot = document.querySelector('input[autocomplete="off"]') as HTMLInputElement
    expect(honeypot).toBeTruthy()
    fireEvent.change(honeypot, { target: { value: 'bot-fill' } })
    // Verify normal submit still works with honeypot filled (backend handles it)
    fireEvent.change(screen.getByPlaceholderText('Votre nom'), { target: { value: 'Bot' } })
    fireEvent.change(screen.getByPlaceholderText('votremail@example.com'), { target: { value: 'bot@spam.com' } })
    fireEvent.change(screen.getByPlaceholderText('Votre message'), { target: { value: 'spam' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByText('Message envoyé. Merci !')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    let resolveFetch!: (value: unknown) => void
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((res) => { resolveFetch = res })))
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText('Votre nom'), { target: { value: 'Dave' } })
    fireEvent.change(screen.getByPlaceholderText('votremail@example.com'), { target: { value: 'dave@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Votre message'), { target: { value: 'Hey' } })
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Envoi…' })).toBeDisabled()
    })
    resolveFetch({ ok: true })
  })
})

// ---------------------------------------------------------------------------
// SectionProjects/SectionTeachingResearch branches
// ---------------------------------------------------------------------------

describe('SectionProjects', () => {
  it('renders project category cards', () => {
    window.location.hash = '#/'
    render(<App />)
    expect(screen.getByText('Traitement documentaire')).toBeInTheDocument()
  })

  it('renders "Voir un exemple" button for non-empty categories', () => {
    window.location.hash = '#/'
    render(<App />)
    const buttons = screen.getAllByText('Voir un exemple')
    expect(buttons.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// ProjectPage
// ---------------------------------------------------------------------------

describe('ProjectPage', () => {
  it('renders project title for known slug', () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'FullMetalWar' })).toBeInTheDocument()
  })

  it('renders breadcrumb with home and projets links', () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    expect(screen.getAllByText('Accueil').length).toBeGreaterThan(0)
    const projetsLinks = screen.getAllByText('Projets')
    expect(projetsLinks.length).toBeGreaterThan(0)
  })

  it('renders 404 message for unknown slug', () => {
    window.location.hash = '#/project/slug-that-does-not-exist'
    render(<App />)
    expect(screen.getByText('Projet introuvable')).toBeInTheDocument()
    expect(screen.getByText(/Ce projet n'existe pas/)).toBeInTheDocument()
  })

  it('renders tags when project has tags', () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    expect(screen.getByText('IA')).toBeInTheDocument()
  })

  it('renders github link when project has github', () => {
    window.location.hash = '#/project/fullmetalwar'
    render(<App />)
    const ghLink = screen.getByText('Voir sur GitHub')
    expect(ghLink).toBeInTheDocument()
  })

  it('renders project page without image for a project that has no image', () => {
    // 'n8n' project has no image defined
    window.location.hash = '#/project/n8n'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'N8N' })).toBeInTheDocument()
    expect(document.querySelector('aside img')).toBeNull()
  })

  it('renders project page without tags badge section for a project without tags', () => {
    // 'generation-de-documents' has no tags
    window.location.hash = '#/project/generation-de-documents'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Génération de documents' })).toBeInTheDocument()
    // No badge spans for tags
    expect(document.querySelector('.badge')).toBeNull()
  })
})
