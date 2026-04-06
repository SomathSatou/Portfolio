import React from 'react'
import api from '../api'

export default function CharacterCreatePage() {
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState('')

  // Form fields
  const [name, setName] = React.useState('')
  const [inviteCode, setInviteCode] = React.useState('')
  const [classType, setClassType] = React.useState('')
  const [description, setDescription] = React.useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Le nom du personnage est requis.')
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        class_type: classType.trim(),
        description: description.trim(),
      }
      const res = await api.post('/characters/', payload)
      const charId = res.data.id
      // If invite code provided, join campaign
      if (inviteCode.trim()) {
        try {
          await api.post(`/characters/${charId}/join-campaign/`, {
            invite_code: inviteCode.trim(),
          })
        } catch (joinErr: unknown) {
          // Character created but join failed — redirect anyway with warning
          if (
            typeof joinErr === 'object' && joinErr !== null && 'response' in joinErr &&
            typeof (joinErr as Record<string, unknown>).response === 'object'
          ) {
            const resp = (joinErr as { response: { data?: { detail?: string } } }).response
            setError(`Personnage créé mais : ${resp.data?.detail || 'code invalide'}. Vous pouvez réessayer depuis la fiche.`)
            setTimeout(() => { window.location.hash = `#/jdr/character/${charId}` }, 2000)
            return
          }
        }
      }
      window.location.hash = `#/jdr/character/${charId}`
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object'
      ) {
        const resp = (err as { response: { data?: Record<string, string[]> } }).response
        const messages = resp.data
          ? Object.values(resp.data).flat().join(' ')
          : ''
        setError(messages || 'Erreur lors de la création du personnage.')
      } else {
        setError('Erreur lors de la création du personnage.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="#/jdr/dashboard" className="hover:underline">
          Dashboard
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-gray-100">Nouveau personnage</span>
      </nav>

      <h1 className="text-2xl font-bold text-primary dark:text-primaryLight mb-6">
        Créer un personnage
      </h1>

      {
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="char-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nom du personnage <span className="text-red-500">*</span>
            </label>
            <input
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Ex : Alaric le Brave"
              autoFocus
              maxLength={200}
            />
          </div>

          {/* Invite code (optional) */}
          <div>
            <label htmlFor="char-invite" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code d'invitation de campagne
            </label>
            <input
              id="char-invite"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Ex : a1b2c3d4"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Optionnel — demandez le code au MJ de la campagne. Vous pourrez aussi rejoindre depuis la fiche personnage.
            </p>
          </div>

          {/* Class type */}
          <div>
            <label htmlFor="char-class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Classe
            </label>
            <input
              id="char-class"
              type="text"
              value={classType}
              onChange={(e) => setClassType(e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Ex : Marchand, Alchimiste, Enchanteur…"
              maxLength={100}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              La classe détermine les mini-jeux accessibles (Marchand, Cultivateur, Enchanteur).
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="char-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="char-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
              placeholder="Décrivez votre personnage : histoire, apparence, motivations…"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <a href="#/jdr/dashboard" className="btn btn-outline text-sm">
              Annuler
            </a>
            <button type="submit" disabled={submitting} className="btn btn-primary text-sm">
              {submitting ? 'Création…' : 'Créer le personnage'}
            </button>
          </div>
        </form>
      }
    </div>
  )
}
