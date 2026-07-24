import type { DiscoveredRecipe } from './types.ts'
import { RARITY_BADGE } from './types.ts'

interface Props {
  recipes: DiscoveredRecipe[]
  loading: boolean
}

function PatternGrid({ pattern }: { pattern: (number | string | null)[][] }) {
  if (!pattern || pattern.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-1 w-max mx-auto">
      {pattern.flat().map((cell, idx) => (
        <div
          key={idx}
          className={`
            w-8 h-8 rounded border flex items-center justify-center text-xs
            ${cell === null
              ? 'border-gray-200 dark:border-gray-700 bg-transparent text-gray-300'
              : 'border-accent2 dark:border-accent1 bg-accent1/10 text-accent2 dark:text-accent1 font-bold'
            }
          `}
        >
          {cell === null ? '' : typeof cell === 'number' ? 'P' : 'C'}
        </div>
      ))}
    </div>
  )
}

export default function GardenRecipesView({ recipes, loading }: Props) {
  if (loading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Chargement des découvertes…</p>
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🧪</div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Aucune recette découverte</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Expérimentez différents agencements de plantes pour découvrir de nouvelles mutations.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {recipes.length} recette{recipes.length > 1 ? 's' : ''} découverte{recipes.length > 1 ? 's' : ''}.
      </p>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((dr) => {
          const recipe = dr.recipe
          const badgeClass = RARITY_BADGE[recipe.result_plant_rarity] ?? 'bg-gray-200 text-gray-700'
          return (
            <div
              key={dr.id}
              className="card p-4 flex flex-col items-center text-center gap-3"
            >
              <div className="text-3xl">{recipe.result_plant_icon}</div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100">{recipe.result_plant_name}</h4>
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1 ${badgeClass}`}>
                  {recipe.result_plant_rarity}
                </span>
              </div>
              <PatternGrid pattern={recipe.pattern} />
              {recipe.required_soil && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Sol : {recipe.required_soil}</p>
              )}
              {recipe.required_fertilizer && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Fertilisant : {recipe.required_fertilizer}</p>
              )}
              {recipe.discovery_hint && (
                <p className="text-xs italic text-amber-600 dark:text-amber-400">{recipe.discovery_hint}</p>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500">Déclenchée {dr.times_triggered} fois</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
