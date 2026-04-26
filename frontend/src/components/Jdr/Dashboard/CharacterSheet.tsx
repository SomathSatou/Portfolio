import React from 'react'
import api from '../api'
import { useAuth } from '../useAuth'
import type { Campaign, CampaignSettings, Character, CharacterItem, CharacterSkill, CharacterSpell, CharacterStat, Item, Skill, Spell } from './types'

interface CharacterSheetProps {
  characterId: string
}

export default function CharacterSheet({ characterId }: CharacterSheetProps) {
  const { user } = useAuth()
  const [character, setCharacter] = React.useState<Character | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [successMsg, setSuccessMsg] = React.useState('')

  // Editable fields
  const [description, setDescription] = React.useState('')
  const [level, setLevel] = React.useState(1)

  // Campaign stats, spells, items
  const [charStats, setCharStats] = React.useState<CharacterStat[]>([])
  const [charSpells, setCharSpells] = React.useState<CharacterSpell[]>([])
  const [charItems, setCharItems] = React.useState<CharacterItem[]>([])
  const [charSkills, setCharSkills] = React.useState<CharacterSkill[]>([])
  const [campaignSpells, setCampaignSpells] = React.useState<Spell[]>([])
  const [campaignSkills, setCampaignSkills] = React.useState<Skill[]>([])
  const [campaignItems, setCampaignItems] = React.useState<Item[]>([])
  const [campaignSettings, setCampaignSettings] = React.useState<CampaignSettings | null>(null)
  const [allCampaigns, setAllCampaigns] = React.useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<number | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false)
  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  // Join campaign by invite code
  const [inviteCode, setInviteCode] = React.useState('')
  const [joining, setJoining] = React.useState(false)
  const [joinError, setJoinError] = React.useState('')
  const [leaving, setLeaving] = React.useState(false)

  const isMJ = user?.role === 'mj'
  const isOwner = character?.player === user?.id
  const canEdit = isOwner || isMJ

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .get<Character>(`/characters/${characterId}/`)
      .then((res) => {
        if (cancelled) return
        const c = res.data
        setCharacter(c)
        setDescription(c.description)
        setLevel(c.level)
        setSelectedCampaignId(c.campaign)
        // Load campaign-related data
        const promises: Promise<void>[] = []
        promises.push(
          api.get<CharacterStat[]>(`/character-stats/?character=${c.id}`).then((r) => { if (!cancelled) setCharStats(r.data) }),
          api.get<CharacterSpell[]>(`/character-spells/?character=${c.id}`).then((r) => { if (!cancelled) setCharSpells(r.data) }),
          api.get<CharacterSkill[]>(`/character-skills/?character=${c.id}`).then((r) => { if (!cancelled) setCharSkills(r.data) }),
          api.get<CharacterItem[]>(`/character-items/?character=${c.id}`).then((r) => { if (!cancelled) setCharItems(r.data) }),
        )
        if (c.campaign) {
          promises.push(
            api.get<Spell[]>(`/spells/?campaign=${c.campaign}`).then((r) => { if (!cancelled) setCampaignSpells(r.data) }),
            api.get<Skill[]>(`/skills/?campaign=${c.campaign}`).then((r) => { if (!cancelled) setCampaignSkills(r.data) }),
            api.get<Item[]>(`/items/?campaign=${c.campaign}`).then((r) => { if (!cancelled) setCampaignItems(r.data) }),
            api.get<CampaignSettings>(`/campaigns/${c.campaign}/settings/`).then((r) => { if (!cancelled) setCampaignSettings(r.data) }),
          )
        }
        return Promise.all(promises).then(() => {})
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de charger le personnage.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [characterId])

  // Load all campaigns for MJ dropdown
  React.useEffect(() => {
    if (!isMJ) return
    api.get<Campaign[]>('/campaigns/').then((res) => setAllCampaigns(res.data)).catch(() => {})
  }, [isMJ])

  const handleCampaignChange = async (campaignId: number | null) => {
    if (!character) return
    setSelectedCampaignId(campaignId)
    try {
      const res = await api.patch<Character>(`/characters/${character.id}/`, { campaign: campaignId })
      setCharacter(res.data)
      setSuccessMsg('Campagne mise à jour.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors du changement de campagne.')
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !character) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await api.post<Character>(`/characters/${character.id}/avatar/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCharacter(res.data)
      setSuccessMsg('Avatar mis à jour.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors de l\'upload de l\'avatar.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!character) return
    setSaving(true)
    setError('')
    setSuccessMsg('')
    try {
      const payload: Partial<Character> = { description }
      if (isMJ) {
        payload.level = level
      }
      const res = await api.patch<Character>(`/characters/${character.id}/`, payload)
      setCharacter(res.data)
      setSuccessMsg('Personnage sauvegardé.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const statMin = campaignSettings?.stat_min ?? 0
  const statMax = campaignSettings?.stat_max ?? 20
  const basePoints = campaignSettings?.base_points ?? 10
  const pointsPerLevel = campaignSettings?.points_per_level ?? 5
  const totalAllowed = basePoints + ((character?.level ?? 1) - 1) * pointsPerLevel
  const totalUsed = charStats.reduce((sum, s) => sum + s.value, 0)
  const pointsRemaining = totalAllowed - totalUsed

  const handleStatChange = async (statId: number, value: number) => {
    if (!character) return
    const clamped = Math.max(statMin, Math.min(statMax, value))
    // Check total constraint before applying
    const currentValue = charStats.find((s) => s.stat === statId)?.value ?? 0
    const delta = clamped - currentValue
    if (delta > 0 && totalUsed + delta > totalAllowed) return
    setCharStats((prev) => prev.map((s) => s.stat === statId ? { ...s, value: clamped } : s))
    try {
      await api.patch('/character-stats/', { character: character.id, stats: [{ stat: statId, value: clamped }] })
    } catch {
      setError('Erreur lors de la mise à jour de la stat.')
      // Revert optimistic update
      setCharStats((prev) => prev.map((s) => s.stat === statId ? { ...s, value: currentValue } : s))
    }
  }

  const handleAddSpell = async (spellId: number) => {
    if (!character) return
    try {
      const res = await api.post<CharacterSpell>('/character-spells/', { character: character.id, spell: spellId })
      setCharSpells((prev) => [...prev, res.data])
    } catch {
      setError('Sort déjà connu ou erreur.')
    }
  }

  const handleRemoveSpell = async (csId: number) => {
    try {
      await api.delete(`/character-spells/${csId}/`)
      setCharSpells((prev) => prev.filter((s) => s.id !== csId))
    } catch {
      setError('Erreur lors du retrait du sort.')
    }
  }

  const handleAddSkill = async (skillId: number) => {
    if (!character) return
    try {
      const res = await api.post<CharacterSkill>('/character-skills/', { character: character.id, skill: skillId })
      setCharSkills((prev) => [...prev, res.data])
    } catch {
      setError('Compétence déjà connue ou erreur.')
    }
  }

  const handleRemoveSkill = async (csId: number) => {
    try {
      await api.delete(`/character-skills/${csId}/`)
      setCharSkills((prev) => prev.filter((s) => s.id !== csId))
    } catch {
      setError('Erreur lors du retrait de la compétence.')
    }
  }

  const handleAddItem = async (itemId: number) => {
    if (!character) return
    try {
      const res = await api.post<CharacterItem>('/character-items/', { character: character.id, item: itemId })
      setCharItems((prev) => {
        const existing = prev.find((i) => i.item === itemId)
        if (existing) return prev.map((i) => i.item === itemId ? res.data : i)
        return [...prev, res.data]
      })
    } catch {
      setError('Erreur lors de l\'ajout de l\'objet.')
    }
  }

  const handleRemoveItem = async (ciId: number) => {
    try {
      await api.delete(`/character-items/${ciId}/`)
      setCharItems((prev) => prev.filter((i) => i.id !== ciId))
    } catch {
      setError('Erreur lors du retrait de l\'objet.')
    }
  }

  const handleJoinCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!character || !inviteCode.trim()) return
    setJoining(true)
    setJoinError('')
    try {
      const res = await api.post<Character>(`/characters/${character.id}/join-campaign/`, {
        invite_code: inviteCode.trim(),
      })
      setCharacter(res.data)
      setSelectedCampaignId(res.data.campaign)
      setInviteCode('')
      setSuccessMsg('Personnage ajouté à la campagne !')
      setTimeout(() => setSuccessMsg(''), 3000)
      // Reload page to get campaign data (stats, spells, items)
      window.location.reload()
    } catch (err: unknown) {
      if (
        typeof err === 'object' && err !== null && 'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object'
      ) {
        const resp = (err as { response: { data?: { detail?: string } } }).response
        setJoinError(resp.data?.detail || 'Code invalide.')
      } else {
        setJoinError('Code invalide ou campagne introuvable.')
      }
    } finally {
      setJoining(false)
    }
  }

  const handleLeaveCampaign = async () => {
    if (!character) return
    setLeaving(true)
    try {
      const res = await api.post<Character>(`/characters/${character.id}/leave-campaign/`)
      setCharacter(res.data)
      setSelectedCampaignId(null)
      setCampaignSpells([])
      setCampaignItems([])
      setCharStats([])
      setSuccessMsg('Personnage retiré de la campagne.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setError('Erreur lors du retrait de la campagne.')
    } finally {
      setLeaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Chargement…</p>
      </div>
    )
  }

  if (error && !character) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500">{error}</p>
        <a href="#/jdr/dashboard" className="btn btn-outline mt-4">
          Retour au dashboard
        </a>
      </div>
    )
  }

  if (!character) return null

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <a href="#/jdr/dashboard" className="hover:underline">Dashboard</a>
        <span className="mx-2">/</span>
        <a href={`#/jdr/campaign/${character.campaign}`} className="hover:underline">{character.campaign_name}</a>
        <span className="mx-2">/</span>
        <span className="text-gray-700 dark:text-gray-300">{character.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {canEdit && (
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              )}
              <button
                type="button"
                disabled={!canEdit || uploadingAvatar}
                onClick={() => canEdit && avatarInputRef.current?.click()}
                className={`block rounded-full focus:outline-none focus:ring-2 focus:ring-primary ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {character.avatar ? (
                  <img
                    src={character.avatar}
                    alt={character.name}
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-primaryLight/40"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                    <svg className="w-10 h-10 text-primary dark:text-primaryLight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
                {canEdit && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingAvatar ? (
                      <span className="text-white text-xs">…</span>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                      </svg>
                    )}
                  </div>
                )}
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary dark:text-primaryLight">{character.name}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {character.class_type || 'Classe inconnue'} — Joueur : {character.player_name}
              </p>
            </div>
          </div>

          {/* Level */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Niveau</label>
            {canEdit && isMJ ? (
              <input
                type="number"
                min={1}
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <span className="text-lg font-semibold text-accent3">{character.level}</span>
            )}
          </div>

          {/* Description */}
          <div className="card">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            {canEdit ? (
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {character.description || 'Aucune description.'}
              </p>
            )}
          </div>

          {/* Campaign Stats (0-20) */}
          {charStats.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-primary dark:text-primaryLight">Statistiques</h2>
                <div className="text-sm">
                  <span className={`font-bold ${pointsRemaining < 0 ? 'text-red-500' : pointsRemaining === 0 ? 'text-accent2' : 'text-accent3'}`}>
                    {totalUsed}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400"> / {totalAllowed} points</span>
                  {pointsRemaining > 0 && (
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">({pointsRemaining} restants)</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                Min {statMin} — Max {statMax} par stat · {basePoints} pts de base + {pointsPerLevel} pts/niveau
              </p>
              <div className="space-y-3">
                {charStats.map((cs) => (
                  <div key={cs.id} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">{cs.stat_name}</span>
                    {canEdit ? (
                      <input
                        type="range"
                        min={statMin}
                        max={statMax}
                        value={cs.value}
                        onChange={(e) => handleStatChange(cs.stat, +e.target.value)}
                        className="flex-1 accent-primary"
                      />
                    ) : (
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-primary dark:bg-primaryLight h-2 rounded-full" style={{ width: `${statMax > 0 ? (cs.value / statMax) * 100 : 0}%` }} />
                      </div>
                    )}
                    <span className="w-8 text-center text-sm font-bold text-primary dark:text-primaryLight">{cs.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Character Skills */}
          <div className="card">
            <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">Compétences</h2>
            {charSkills.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune compétence acquise.</p>
            ) : (
              <div className="space-y-2">
                {charSkills.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{cs.skill_name}</span>
                      {cs.skill_category && <span className="ml-2 text-xs text-gray-500">{cs.skill_category}</span>}
                      {cs.skill_description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cs.skill_description}</p>}
                    </div>
                    {canEdit && (
                      <button onClick={() => handleRemoveSkill(cs.id)} className="text-xs text-red-500 hover:underline shrink-0">Retirer</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && campaignSkills.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleAddSkill(+e.target.value); e.target.value = '' }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>+ Ajouter une compétence…</option>
                  {campaignSkills
                    .filter((s) => !charSkills.some((cs) => cs.skill === s.id))
                    .map((s) => <option key={s.id} value={s.id}>{s.name}{s.category ? ` (${s.category})` : ''}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Character Spells */}
          <div className="card">
            <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">Sorts connus</h2>
            {charSpells.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun sort appris.</p>
            ) : (
              <div className="space-y-2">
                {charSpells.map((cs) => (
                  <div key={cs.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{cs.spell_name}</span>
                      <span className="ml-2 text-xs text-gray-500">Niv. {cs.spell_level}</span>
                      {cs.spell_school && <span className="ml-2 text-xs text-gray-500">{cs.spell_school}</span>}
                    </div>
                    {canEdit && (
                      <button onClick={() => handleRemoveSpell(cs.id)} className="text-xs text-red-500 hover:underline shrink-0">Retirer</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && campaignSpells.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleAddSpell(+e.target.value); e.target.value = '' }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>+ Ajouter un sort…</option>
                  {campaignSpells
                    .filter((s) => !charSpells.some((cs) => cs.spell === s.id))
                    .map((s) => <option key={s.id} value={s.id}>{s.name} (Niv. {s.level})</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Character Items */}
          <div className="card">
            <h2 className="text-lg font-semibold text-primary dark:text-primaryLight mb-3">Inventaire</h2>
            {charItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Inventaire vide.</p>
            ) : (
              <div className="space-y-2">
                {charItems.map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{ci.item_name}</span>
                      {ci.quantity > 1 && <span className="ml-1 text-xs text-gray-500">(x{ci.quantity})</span>}
                      {ci.is_equipped && <span className="ml-2 badge text-xs">Équipé</span>}
                    </div>
                    {canEdit && (
                      <button onClick={() => handleRemoveItem(ci.id)} className="text-xs text-red-500 hover:underline shrink-0">Retirer</button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {canEdit && campaignItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleAddItem(+e.target.value); e.target.value = '' }}
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="" disabled>+ Ajouter un objet…</option>
                  {campaignItems.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Save button */}
          {canEdit && (
            <div className="flex items-center gap-3">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
              {successMsg && <span className="text-sm text-green-600">{successMsg}</span>}
              {error && <span className="text-sm text-red-500">{error}</span>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="card h-fit space-y-3">
          <h3 className="font-semibold text-primary dark:text-primaryLight">Infos</h3>
          <dl className="text-sm space-y-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Campagne</dt>
              <dd>
                {isMJ ? (
                  <select
                    value={selectedCampaignId ?? ''}
                    onChange={(e) => handleCampaignChange(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Aucune —</option>
                    {allCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                ) : character.campaign ? (
                  <div className="flex items-center gap-2">
                    <a href={`#/jdr/campaign/${character.campaign}`} className="hover:underline">
                      {character.campaign_name}
                    </a>
                    {isOwner && (
                      <button
                        onClick={handleLeaveCampaign}
                        disabled={leaving}
                        className="text-xs text-red-500 hover:underline"
                      >
                        {leaving ? '…' : 'Quitter'}
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">Aucune</span>
                )}
              </dd>
            </div>
            {/* Join campaign via invite code */}
            {isOwner && !character.campaign && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <dt className="text-gray-500 dark:text-gray-400 mb-1">Rejoindre une campagne</dt>
                <dd>
                  <form onSubmit={handleJoinCampaign} className="space-y-2">
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Code d'invitation"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={joining || !inviteCode.trim()}
                      className="btn btn-primary text-xs w-full"
                    >
                      {joining ? 'Envoi…' : 'Rejoindre'}
                    </button>
                    {joinError && (
                      <p className="text-xs text-red-500">{joinError}</p>
                    )}
                  </form>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Classe</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.class_type || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Niveau</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.level}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Joueur</dt>
              <dd className="text-gray-900 dark:text-gray-100">{character.player_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Créé le</dt>
              <dd className="text-gray-900 dark:text-gray-100">
                {new Date(character.created_at).toLocaleDateString('fr-FR')}
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  )
}
