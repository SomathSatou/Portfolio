import React from 'react'
import IrlRpgHeader from './headers/IrlRpgHeader'
import JdrHeader from './headers/JdrHeader'
import PortfolioHeader from './headers/PortfolioHeader'

function getAppTheme(hash: string): 'jdr' | 'irlrpg' | null {
  if (hash.startsWith('#/jdr')) return 'jdr'
  if (hash.startsWith('#/irlrpg')) return 'irlrpg'
  return null
}

export default function Header() {
  const [hash, setHash] = React.useState<string>(window.location.hash || '#/')

  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const appTheme = getAppTheme(hash)

  if (appTheme === 'jdr') return <JdrHeader />
  if (appTheme === 'irlrpg') return <IrlRpgHeader />
  return <PortfolioHeader />
}
