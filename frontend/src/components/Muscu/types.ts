export type MetricType = 'weight_reps' | 'distance' | 'duration' | 'reps_only'

export const METRIC_LABELS: Record<MetricType, string> = {
  weight_reps: 'Poids × Répétitions',
  distance: 'Distance (m)',
  duration: 'Durée (min)',
  reps_only: 'Répétitions seules',
}

export interface MuscleTarget {
  id: number
  muscle: number
  muscle_name: string
  muscle_group: string
  involvement: number
}

export interface Exercise {
  id: number
  name: string
  description: string
  machine: number | null
  machine_name: string | null
  is_public: boolean
  created_by: number
  created_by_name: string
  difficulty_factor: number
  metric_type: MetricType
  muscle_targets: MuscleTarget[]
  created_at: string
}

export interface ExerciseInput {
  name: string
  description: string
  machine: number | null
  difficulty_factor: number
  metric_type: MetricType
  muscle_ids: number[]
}

export interface MuscleGroup {
  id: number
  name: string
  icon: string
  order: number
  muscles: { id: number; name: string }[]
}

export interface Muscle {
  id: number
  name: string
  group: number
}

export interface Gym {
  id: number
  name: string
  address: string
  city: string
}

export interface Machine {
  id: number
  name: string
  gym: number
  description: string
}

export interface WorkoutSet {
  id: number
  exercise: number
  exercise_name: string
  metric_type: MetricType
  weight_kg: number
  reps: number
  quantity_value: number
  order: number
  created_at: string
}

export interface Workout {
  id: number
  gym: number | null
  gym_name: string | null
  started_at: string
  finished_at: string | null
  status: string
  notes: string
  sets: WorkoutSet[]
}
