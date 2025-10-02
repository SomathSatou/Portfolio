import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Apply initial theme before rendering to avoid FOUC
const rootEl = document.documentElement
try {
  const stored = localStorage.getItem('theme')
  if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    rootEl.classList.add('dark')
  } else {
    rootEl.classList.remove('dark')
  }
} catch {
  // no-op if storage not available
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
