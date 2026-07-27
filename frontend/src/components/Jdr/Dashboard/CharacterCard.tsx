import { User } from 'lucide-react'
import type { Character } from './types'

interface CharacterCardProps {
  character: Character
}

export default function CharacterCard({ character }: CharacterCardProps) {
  return (
    <a
      href={`#/jdr/character/${character.id}`}
      className="character-card-jdr block no-underline animate-fadeIn"
    >
      <div className="flex items-center gap-3">
        {character.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="character-avatar-jdr w-12 h-12 rounded-full object-cover ring-2"
          />
        ) : (
          <div className="character-avatar-jdr w-12 h-12 rounded-full flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="character-name-jdr font-semibold truncate">{character.name}</h3>
          <p className="character-info-jdr text-xs truncate">
            {character.class_type || 'Classe inconnue'} — Niv. {character.level}
          </p>
        </div>
      </div>

      <div className="mt-2 text-xs">
        <span className="character-badge-jdr">{character.campaign_name}</span>
      </div>
    </a>
  )
}
