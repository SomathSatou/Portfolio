import { User } from 'lucide-react'
import type { Character } from './types'

interface CharacterCardProps {
  character: Character
}

export default function CharacterCard({ character }: CharacterCardProps) {
  return (
    <a
      href={`#/jdr/character/${character.id}`}
      className="card-glass block no-underline animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        {character.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/40 dark:ring-primaryLight/40"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary dark:text-primaryLight" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary dark:text-primaryLight truncate">{character.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {character.class_type || 'Classe inconnue'} — Niv. {character.level}
          </p>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
        <span className="badge">{character.campaign_name}</span>
      </div>
    </a>
  )
}
