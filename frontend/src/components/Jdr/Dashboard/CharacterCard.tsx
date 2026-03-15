import type { Character } from './types'

interface CharacterCardProps {
  character: Character
}

export default function CharacterCard({ character }: CharacterCardProps) {
  return (
    <a
      href={`#/jdr/character/${character.id}`}
      className="card block no-underline hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3">
        {character.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/30"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary dark:text-primaryLight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
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
