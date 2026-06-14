import type { CharacterWithStats } from '../Dashboard/types'
import { formatCurrency } from './diceUtils'

interface Props {
  isOpen: boolean
  onClose: () => void
  character: CharacterWithStats | null
  isMJ: boolean
}

const BADGE_COLORS = [
  'bg-primary/20 text-primary dark:bg-primaryLight/20 dark:text-primaryLight',
  'bg-accent1/20 text-accent2',
  'bg-accent3/20 text-yellow-800 dark:text-accent3',
  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
]

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((current / max) * 100))) : 0
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function CharacterDetailDrawer({ isOpen, onClose, character }: Props) {
  if (!character) return null

  const stats = character.character_stats ?? []
  const hpColor = character.max_hp > 0
    ? character.hp / character.max_hp > 0.5
      ? 'bg-green-500'
      : character.hp / character.max_hp > 0.2
        ? 'bg-yellow-500'
        : 'bg-red-500'
    : 'bg-green-500'

  const mpColor = 'bg-blue-500'

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-[480px] max-w-[95vw] bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="font-semibold text-primary dark:text-primaryLight">
            Fiche — {character.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            {character.avatar ? (
              <img
                src={character.avatar}
                alt={character.name}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-primaryLight/40 shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
                <svg className="w-10 h-10 text-primary dark:text-primaryLight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{character.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {character.class_type || 'Classe inconnue'} — Niv. {character.level}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Joueur : {character.player_name}
              </p>
            </div>
          </div>

          {/* HP / MP bars */}
          {(character.max_hp > 0 || character.max_mp > 0) && (
            <div className="space-y-3">
              {character.max_hp > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">PV</span>
                    <span>{character.hp} / {character.max_hp}</span>
                  </div>
                  <HpBar current={character.hp} max={character.max_hp} color={hpColor} />
                </div>
              )}
              {character.max_mp > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Mana</span>
                    <span>{character.mp} / {character.max_mp}</span>
                  </div>
                  <HpBar current={character.mp} max={character.max_mp} color={mpColor} />
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {stats.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Statistiques
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.map((cs, i) => (
                  <span
                    key={cs.id}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
                  >
                    {cs.stat_name} {cs.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Wallet */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Bourse
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatCurrency(character.gold, character.silver, character.copper)}
            </p>
          </div>

          {/* Description */}
          {character.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {character.description}
              </p>
            </div>
          )}

          {/* Full sheet link */}
          <div className="pt-2">
            <a
              href={`#/jdr/character/${character.id}`}
              className="btn btn-outline text-sm w-full text-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir la fiche complète →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
