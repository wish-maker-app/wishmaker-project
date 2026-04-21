import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { prewarmModerationModel } from '../../lib/moderationImage'

const GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'

function StepProgress({ current, total = 3 }) {
  return (
    <div className="flex gap-2 px-5 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: GRADIENT }}
            initial={{ width: 0 }}
            animate={{ width: i < current ? '100%' : '0%' }}
            transition={{ duration: 0.3 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function SetupProfil() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)

  const [prenom, setPrenom] = useState(profile?.prenom || '')
  const [nom, setNom] = useState(profile?.nom || '')
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  // Prewarm modèle NSFW.js
  useEffect(() => { prewarmModerationModel() }, [])

  useEffect(() => {
    if (profile) {
      if (profile.prenom) setPrenom(profile.prenom)
      if (profile.nom) setNom(profile.nom)
      if (profile.avatar_url) setAvatarPreview(profile.avatar_url)
    }
  }, [profile])

  async function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    try {
      // Modération NSFW avant upload
      const { moderateImage } = await import('../../lib/moderationImage')
      const mod = await moderateImage(file)
      if (!mod.isClean) {
        toast.error(mod.reason || 'Cette image ne respecte pas nos règles')
        setUploading(false)
        return
      }

      const { compressImage } = await import('../../lib/imageCompression')
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 })
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(`${profile.id}/avatar.jpg`, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(`${profile.id}/avatar.jpg`)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').update({ avatar_url: url }).eq('id', profile.id)
      setProfile({ ...profile, avatar_url: url })
      setAvatarPreview(url)
    } catch (err) {
      console.error('[setup/profil avatar]', err)
      toast.error('Erreur upload photo')
    } finally { setUploading(false) }
  }

  async function handleContinue() {
    if (!prenom.trim() || !nom.trim()) {
      toast.error('Prénom et nom obligatoires')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ prenom: prenom.trim(), nom: nom.trim() })
        .eq('id', profile.id)
      if (error) throw error
      setProfile({ ...profile, prenom: prenom.trim(), nom: nom.trim() })
      navigate('/setup/pseudo', { replace: true })
    } catch (err) {
      console.error('[setup/profil save]', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  const canContinue = prenom.trim().length >= 2 && nom.trim().length >= 2

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Ton profil" />
      <StepProgress current={1} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pb-10 overflow-y-auto"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#1A1A2E]">Dis-nous qui tu es</h1>
          <p className="text-sm text-[#8A8A9A] mt-1">Ces infos apparaîtront sur ton profil public.</p>
        </div>

        {/* Avatar — optionnel */}
        <div className="flex flex-col items-center mb-6 gap-2">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#F0F0F0] shadow-md bg-[#F5F5F7]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-2xl"
                  style={{ background: GRADIENT }}>
                  {(prenom[0] || '?').toUpperCase()}{(nom[0] || '').toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center shadow-md"
              style={{ background: GRADIENT }}
              aria-label="Ajouter une photo"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
          </div>
          <p className="text-[11px] text-[#8A8A9A]">Photo optionnelle</p>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Prénom"
            placeholder="Ton prénom"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            autoFocus={!prenom}
          />
          <Input
            label="Nom"
            placeholder="Ton nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus={!!prenom && !nom}
          />
        </div>

        <div className="mt-auto pt-6">
          <Button onClick={handleContinue} loading={saving} disabled={!canContinue}>
            Continuer
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
