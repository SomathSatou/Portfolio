import { Shield } from 'lucide-react'
import ItemCard from './ui/ItemCard'
import JdrCard from './ui/JdrCard'
import SpellCard from './ui/SpellCard'
import WaxSeal from './ui/WaxSeal'

const spellSchools = ['Psychique', 'Nécrotique', 'Eau', 'Feu', 'Foudre', 'Glace', 'Nature', 'Sacré', 'Ombre', 'Arcanique']
const itemTypes = ['Arme', 'Armure', 'Anneau', 'Potion', 'Outil', 'Ressource', 'Divers']

export default function JdrCardPreview() {
  return (
    <main className="parchment-bg min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="title-medieval text-3xl">Atelier des cartes JDR</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Prévisualisation réservée au développement.</p>
        </header>
        <JdrCard className="relative min-h-40 p-6">
          <WaxSeal label="Carte scellée" tone="wine" />
          <h2 className="jdr-card-title">Parchemin par défaut</h2>
          <p className="jdr-card-description mt-2">Toutes les cartes JDR héritent de cette matière, de ses filets et de son encre.</p>
        </JdrCard>
        <section>
          <h2 className="title-medieval mb-3 text-xl">Sorts</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spellSchools.map((school, index) => <SpellCard key={school} name={`Sort ${school}`} school={school} level={index + 1} manaCost={index + 2} description="Une formule archivée dans le grimoire." />)}
          </div>
        </section>
        <section>
          <h2 className="title-medieval mb-3 text-xl">Objets</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {itemTypes.map((itemType) => <ItemCard key={itemType} name={`${itemType} d'exemple`} itemType={itemType} rarity="Rare" magical={itemType === 'Anneau'} description="Un objet consigné dans l'inventaire de la campagne." />)}
          </div>
        </section>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Shield size={18} /> Variantes testées en clair et en grimoire sombre.</div>
      </div>
    </main>
  )
}
