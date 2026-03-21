import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'

// ── Modal changement photo ──
function PhotoModal({ open, onClose, onPickGallery, onDelete, hasPhoto }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed left-6 right-6 top-1/2 -translate-y-1/2 bg-white rounded-3xl z-[901] px-1 py-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-[#1A1A2E] text-center mb-5">Changez votre photo</h2>

            <button
              onClick={onPickGallery}
              className="flex items-center gap-4 w-full px-5 py-4 text-left border-b border-[#F0F0F0]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F7F8FC] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="3" width="20" height="18" rx="3" stroke="#1A1A2E" strokeWidth="1.8"/>
                  <circle cx="8.5" cy="8.5" r="2" stroke="#1A1A2E" strokeWidth="1.8"/>
                  <path d="M2 16l5-5 4 4 3-3 8 8" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-[15px] font-medium text-[#1A1A2E]">Choisissez dans votre galerie</span>
            </button>

            {hasPhoto && (
              <button
                onClick={onDelete}
                className="flex items-center gap-4 w-full px-5 py-4 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[15px] font-medium text-red-500">Supprimer la photo</span>
              </button>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Champ formulaire ──
function FormField({ label, value, onChange, type = 'text', placeholder = '', disabled = false }) {
  const baseClass = 'w-full bg-white rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none border border-[#E0E0E0] focus:border-[#5B6BF5] transition-colors'
  return (
    <div className="mb-4">
      <label className="text-[13px] font-medium text-[#8A8A9A] mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${baseClass} h-12 disabled:opacity-50`}
      />
    </div>
  )
}

// ── Debounce helper ──
function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function EditProfile() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)

  const avatarInputRef = useRef(null)

  const [nom, setNom] = useState(profile?.nom || '')
  const [prenom, setPrenom] = useState(profile?.prenom || '')
  const [pseudo, setPseudo] = useState(profile?.pseudo || '')
  const [localisation, setLocalisation] = useState(profile?.ville || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)

  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)

  // ── Location autocomplete ──
  const [citySuggestions, setCitySuggestions] = useState([])
  const [cityLoading, setCityLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchCities = useCallback(
    debounce(async (q) => {
      if (q.length < 2) { setCitySuggestions([]); return }
      setCityLoading(true)
      try {
        const isPostalCode = /^\d{2,5}$/.test(q.trim())
        const url = isPostalCode
          ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q.trim())}&fields=nom,codesPostaux,departement&limit=10`
          : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,departement&boost=population&limit=6`
        const res = await fetch(url)
        const data = await res.json()
        setCitySuggestions(data)
        setShowSuggestions(true)
      } catch {
        setCitySuggestions([])
      } finally {
        setCityLoading(false)
      }
    }, 300),
    []
  )

  if (!profile) return null

  const hasChanges =
    nom !== (profile.nom || '') ||
    prenom !== (profile.prenom || '') ||
    pseudo !== (profile.pseudo || '') ||
    localisation !== (profile.ville || '')

  // ── Upload image helper ──
  async function uploadImage(file, path) {
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)
    return `${publicUrl}?t=${Date.now()}`
  }

  // ── Avatar ──
  async function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }

    setPhotoModal(false)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const url = await uploadImage(file, `${profile.id}/avatar.${ext}`)

      await supabase.from('users').update({ avatar_url: url }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: url })
      setAvatarPreview(url)
      toast.success('Photo mise à jour !')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'upload')
    } finally { setUploading(false) }
  }

  async function handleDeleteAvatar() {
    setPhotoModal(false)
    setUploading(true)
    try {
      await supabase.from('users').update({ avatar_url: null }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: null })
      setAvatarPreview(null)
      toast.success('Photo supprimée')
    } catch (err) {
      toast.error('Erreur')
    } finally { setUploading(false) }
  }

  // ── Save form ──
  async function handleSave() {
    if (!nom.trim() || !prenom.trim()) { toast.error('Nom et prénom obligatoires'); return }
    if (pseudo && !/^[a-zA-Z0-9_]{3,20}$/.test(pseudo)) {
      toast.error('Pseudo : 3-20 caractères (lettres, chiffres, _)')
      return
    }
    setSaving(true)
    try {
      const updates = {
        nom: nom.trim(),
        prenom: prenom.trim(),
        pseudo: pseudo.trim() || null,
        ville: localisation.trim() || null,
      }
      const { error } = await supabase.from('users').update(updates).eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, ...updates })
      toast.success('Profil mis à jour !')
      navigate(-1)
    } catch (err) {
      console.error('Save error:', err)
      if (err.code === '23505' || err.message?.includes('unique') || err.message?.includes('pseudo')) {
        toast.error('Ce pseudo est déjà pris')
      } else {
        toast.error(err.message || 'Erreur lors de la sauvegarde')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Profil" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Avatar centré */}
        <div className="flex justify-center pt-4 pb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#F0F0F0] shadow-md">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-2xl"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                  {profile.prenom[0]}{profile.nom[0]}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => setPhotoModal(true)}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Formulaire */}
        <div className="px-5">
          <FormField label="Prénom" value={prenom} onChange={setPrenom} placeholder="Votre prénom" />
          <FormField label="Nom" value={nom} onChange={setNom} placeholder="Votre nom" />
          <FormField label="Pseudo" value={pseudo} onChange={(v) => setPseudo(v.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="Votre pseudo (ex: john_doe)" />
          <FormField label="E-mail" value={profile.email || ''} onChange={() => {}} disabled placeholder="E-mail" />

          {/* Localisation avec autocomplétion */}
          <div className="mb-4 relative">
            <label className="text-[13px] font-medium text-[#8A8A9A] mb-1.5 block">Localisation</label>
            <div className="relative flex items-center">
              <svg className="absolute left-4 text-[#8A8A9A]" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                value={localisation}
                onChange={(e) => {
                  setLocalisation(e.target.value)
                  searchCities(e.target.value)
                }}
                onFocus={() => citySuggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Rechercher une ville..."
                className="w-full h-12 bg-white rounded-2xl pl-11 pr-4 text-sm text-[#1A1A2E] outline-none border border-[#E0E0E0] focus:border-[#5B6BF5] transition-colors"
              />
              {cityLoading && (
                <span className="absolute right-4">
                  <svg className="animate-spin h-4 w-4 text-[#5B6BF5]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </span>
              )}
            </div>

            {/* Suggestions dropdown */}
            <AnimatePresence>
              {showSuggestions && citySuggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-lg border border-[#E0E0E0] overflow-hidden z-10"
                >
                  {citySuggestions.map((city, i) => {
                    const cp = city.codesPostaux?.[0] || ''
                    const dep = city.departement?.nom || ''
                    return (
                      <motion.li
                        key={city.code || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: i * 0.03 } }}
                      >
                        <button
                          onClick={() => {
                            setLocalisation(`${city.nom} (${cp})`)
                            setShowSuggestions(false)
                            setCitySuggestions([])
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] active:bg-[#F0F0F0] transition-colors text-left"
                        >
                          <span className="text-[#5B6BF5] flex-shrink-0">
                            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1A1A2E]">{city.nom}</p>
                            <p className="text-xs text-[#8A8A9A]">{cp} - {dep}</p>
                          </div>
                        </button>
                      </motion.li>
                    )
                  })}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-4">
            <Button onClick={handleSave} loading={saving} disabled={!hasChanges && !saving}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </div>

      {/* Modal photo */}
      <PhotoModal
        open={photoModal}
        onClose={() => setPhotoModal(false)}
        hasPhoto={!!avatarPreview}
        onPickGallery={() => {
          setPhotoModal(false)
          setTimeout(() => avatarInputRef.current?.click(), 200)
        }}
        onDelete={handleDeleteAvatar}
      />
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
    </div>
  )
}
