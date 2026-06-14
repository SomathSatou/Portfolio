import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Footer from '../components/Footer'
import Header from '../components/Header'
import Layout from '../components/Layout'

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

describe('Footer', () => {
  it('renders current year', () => {
    render(<Footer />)
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  it('renders author name', () => {
    render(<Footer />)
    expect(screen.getByText(/Thomas Saout/)).toBeInTheDocument()
  })

  it('renders tech stack mention', () => {
    render(<Footer />)
    expect(screen.getByText(/Django \+ React/)).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

describe('Header', () => {
  beforeEach(() => {
    // Reset HTML element classes and localStorage before each test
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  it('renders the brand link', () => {
    render(<Header />)
    expect(screen.getByText('Thomas Saout')).toBeInTheDocument()
  })

  it('renders all navigation links', () => {
    render(<Header />)
    expect(screen.getByText('CV')).toBeInTheDocument()
    expect(screen.getByText('Projets')).toBeInTheDocument()
    expect(screen.getByText('Enseignement et Recherche')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    render(<Header />)
    const toggles = screen.getAllByLabelText('Basculer le thème')
    expect(toggles.length).toBeGreaterThan(0)
  })

  it('shows "Mode sombre" when in light mode', () => {
    document.documentElement.classList.remove('dark')
    render(<Header />)
    expect(screen.getByText('Mode sombre')).toBeInTheDocument()
  })

  it('shows "Mode clair" when in dark mode', () => {
    document.documentElement.classList.add('dark')
    render(<Header />)
    expect(screen.getByText('Mode clair')).toBeInTheDocument()
  })

  it('toggles to dark mode when clicking theme button in light mode', () => {
    document.documentElement.classList.remove('dark')
    render(<Header />)
    const toggle = screen.getByText('Mode sombre')
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('toggles to light mode when clicking theme button in dark mode', () => {
    document.documentElement.classList.add('dark')
    render(<Header />)
    const toggle = screen.getByText('Mode clair')
    fireEvent.click(toggle)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('saves dark theme to localStorage', () => {
    document.documentElement.classList.remove('dark')
    render(<Header />)
    fireEvent.click(screen.getByText('Mode sombre'))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('saves light theme to localStorage', () => {
    document.documentElement.classList.add('dark')
    render(<Header />)
    fireEvent.click(screen.getByText('Mode clair'))
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('opens mobile menu on hamburger click', () => {
    render(<Header />)
    const hamburger = screen.getByLabelText('Ouvrir le menu')
    fireEvent.click(hamburger)
    // Mobile menu should appear (nav with all links duplicated)
    const cvLinks = screen.getAllByText('CV')
    expect(cvLinks.length).toBeGreaterThan(1)
  })

  it('closes mobile menu after clicking a link', () => {
    render(<Header />)
    fireEvent.click(screen.getByLabelText('Ouvrir le menu'))
    const cvLinks = screen.getAllByText('CV')
    fireEvent.click(cvLinks[cvLinks.length - 1])
    // After closing, only one CV link should remain (desktop nav)
    expect(screen.getAllByText('CV').length).toBe(1)
  })

  it('nav links have correct hrefs', () => {
    render(<Header />)
    const cvLink = screen.getByText('CV').closest('a')
    expect(cvLink).toHaveAttribute('href', '#/cv')
    const projectsLink = screen.getByText('Projets').closest('a')
    expect(projectsLink).toHaveAttribute('href', '#/projects')
    const contactLink = screen.getByText('Contact').closest('a')
    expect(contactLink).toHaveAttribute('href', '#/contact')
  })

  it('brand link points to home hash', () => {
    render(<Header />)
    const brand = screen.getByText('Thomas Saout').closest('a')
    expect(brand).toHaveAttribute('href', '#/')
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })
})

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe('Layout', () => {
  it('renders children content', () => {
    render(<Layout><div data-testid="child">Hello</div></Layout>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('renders header', () => {
    render(<Layout><span /></Layout>)
    expect(screen.getByText('Thomas Saout')).toBeInTheDocument()
  })

  it('renders footer', () => {
    render(<Layout><span /></Layout>)
    const year = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  it('wraps content in a main element', () => {
    render(<Layout><div data-testid="inner">test</div></Layout>)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
    expect(main).toContainElement(screen.getByTestId('inner'))
  })
})
