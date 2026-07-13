import React from 'react'
import IrlRpgHeader from './headers/IrlRpgHeader'
import JdrHeader from './headers/JdrHeader'
import PortfolioHeader from './headers/PortfolioHeader'

function getRoute(): string {
  const hash = window.location.hash
  if (hash && hash.length > 1) return hash
  return window.location.pathname
}

function getAppTheme(route: string): 'jdr' | 'irlrpg' | null {
  if (route.startsWith('#/jdr') || route.startsWith('/jdr')) return 'jdr'
  if (route.startsWith('#/irlrpg') || route.startsWith('/irlrpg')) return 'irlrpg'
  return null
}

export default function Header() {
  const [route, setRoute] = React.useState<string>(getRoute())

  React.useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const appTheme = getAppTheme(route)

  if (appTheme === 'jdr') return <JdrHeader />
  if (appTheme === 'irlrpg') return <IrlRpgHeader />
  return <PortfolioHeader />
}
