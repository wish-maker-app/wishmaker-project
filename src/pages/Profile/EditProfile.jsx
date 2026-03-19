import { useState, useRef } from 'react'
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
            className="fixed inset-0 bg-black/40 z-[900]"
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

// ── Champ formulaire style maquette (bordure arrondie) ──
function FormField({ label, value, onChange, type = 'text', placeholder = '', disabled = false, multiline = false }) {
  const baseClass = 'w-full bg-white rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none border border-[#E0E0E0] focus:border-[#5B6BF5] transition-colors'
  return (
    <div className="mb-4">
      <label className="text-[13px] font-medium text-[#8A8A9A] mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={`${baseClass} py-3 resize-none disabled:opacity-50`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${baseClass} h-12 disabled:opacity-50`}
        />
      )}
    </div>
  )
}

export default function EditProfile() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  const [nom, setNom] = useState(profile?.nom || '')
  const [prenom, setPrenom] = useState(profile?.prenom || '')
  const [dateNaissance, setDateNaissance] = useState(profile?.date_naissance || '')
  const [genre, setGenre] = useState(profile?.genre || '')
  const [localisation, setLocalisation] = useState(profile?.ville || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoModal, setPhotoModal] = useState(false)

  // Preview local pour banner
  const [bannerPreview, setBannerPreview] = useState(profile?.banner_url || null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)

  if (!profile) return null

  const hasChanges =
    nom !== (profile.nom || '') ||
    prenom !== (profile.prenom || '') ||
    dateNaissance !== (profile.date_naissance || '') ||
    genre !== (profile.genre || '') ||
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

  // ── Banner ──
  async function handleBannerPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const url = await uploadImage(file, `${profile.id}/banner.${ext}`)

      await supabase.from('users').update({ banner_url: url }).eq('id', profile.id)
      setProfile({ ...profile, banner_url: url })
      setBannerPreview(url)
      toast.success('Bannière mise à jour !')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de l\'upload')
    } finally { setUploading(false) }
  }

  // ── Save form ──
  async function handleSave() {
    if (!nom.trim() || !prenom.trim()) { toast.error('Nom et prénom obligatoires'); return }
    setSaving(true)
    try {
      const updates = {
        nom: nom.trim(),
        prenom: prenom.trim(),
        date_naissance: dateNaissance || null,
        genre: genre || null,
        ville: localisation.trim() || null,
      }
      const { error } = await supabase.from('users').update(updates).eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, ...updates })
      toast.success('Profil mis à jour !')
      navigate(-1)
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Profil" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Banner + Avatar */}
        <div className="relative mx-5 mb-14">
          {/* Banner */}
          <div className="relative h-[140px] rounded-2xl overflow-hidden bg-[#E8EAFF]">
            {bannerPreview ? (
              <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#7EB6FF,#5B6BF5)' }} />
            )}
            {/* Bouton edit banner */}
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerPick} />
          </div>

          {/* Avatar centré, chevauchant la bannière */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-10">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-md">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-white text-xl"
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
              {/* Bouton edit avatar */}
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
        </div>

        {/* Formulaire */}
        <div className="px-5 pt-2">
          <FormField label="Nom" value={nom} onChange={setNom} placeholder="Votre nom" />
          <FormField label="Prénom" value={prenom} onChange={setPrenom} placeholder="Votre prénom" />
          <FormField label="E-mail" value={profile.email || ''} onChange={() => {}} disabled placeholder="E-mail" />
          <FormField label="Date de naissance" value={dateNaissance} onChange={setDateNaissance} type="date" />

          {/* Genre */}
          <div className="mb-4">
            <label className="text-[13px] font-medium text-[#8A8A9A] mb-1.5 block">Genre</label>
            <div className="flex gap-3">
              {[
                { id: 'male', label: 'Male' },
                { id: 'female', label: 'Female' },
              ].map((g) => {
                const isActive = genre === g.id
                return (
                  <button
                    key={g.id}
                    onClick={() => setGenre(g.id)}
                    className="flex-1 h-12 rounded-2xl flex items-center justify-center gap-2 border-2 transition-all text-sm font-semibold"
                    style={isActive
                      ? { borderColor: '#5B6BF5', background: '#EEF0FF', color: '#5B6BF5' }
                      : { borderColor: '#E0E0E0', color: '#1A1A2E' }
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: isActive ? '#5B6BF5' : '#D0D0D0' }}
                    >
                      {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#5B6BF5]" />}
                    </div>
                    {g.label}
                  </button>
                )
              })}
            </div>
          </div>

          <FormField label="Location" value={localisation} onChange={setLocalisation} placeholder="Votre ville ou adresse" multiline />

          <div className="mt-4">
            <Button onClick={handleSave} loading={saving} disabled={!hasChanges && !saving}>
              Save Changes
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
