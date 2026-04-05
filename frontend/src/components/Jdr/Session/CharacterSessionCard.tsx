import type { CharacterWithStats } from '../Dashboard/types'
import { formatCurrency } from './diceUtils'

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

interface Props {
  character: CharacterWithStats
  isMJ: boolean
  onWalletChange?: (characterId: number, field: 'gold' | 'silver' | 'copper', value: number) => void
}

export default function CharacterSessionCard({ character, isMJ, onWalletChange }: Props) {
  const stats = character.character_stats ?? []

  return (
    <div className="card space-y-3">
      {/* Header: avatar + name */}
      <div className="flex items-center gap-3">
        {character.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-primaryLight/40 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 text-primary dark:text-primaryLight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary dark:text-primaryLight truncate">{character.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {character.class_type || 'Classe inconnue'} — Niv. {character.level}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {character.player_name}
          </p>
        </div>
      </div>

      {/* Stats badges */}
      {stats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stats.map((cs, i) => (
            <span
              key={cs.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLORS[i % BADGE_COLORS.length]}`}
            >
              {cs.stat_name.substring(0, 3).toUpperCase()} {cs.value}
            </span>
          ))}
        </div>
      )}

      {/* Wallet */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bourse</p>
        {isMJ && onWalletChange ? (
          <div className="grid grid-cols-3 gap-2">
            {(['gold', 'silver', 'copper'] as const).map((field) => {
              const label = field === 'gold' ? '🥇 po' : field === 'silver' ? '🥈 pa' : '🥉 pc'
              return (
                <div key={field} className="flex flex-col items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    value={character[field]}
                    onChange={(e) => onWalletChange(character.id, field, Math.max(0, Number(e.target.value)))}
                    className="w-full text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-1 py-0.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(character.gold, character.silver, character.copper)}
          </p>
        )}
      </div>
    </div>
  )
}
