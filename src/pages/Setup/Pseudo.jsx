import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import { checkContent } from '../../lib/moderation'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'

const GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
const PSEUDO_RE = /^[a-zA-Z0-9_ ]+$/
const DEBOUNCE_MS = 400

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

export default function SetupPseudo() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)

  const [pseudo, setPseudo] = useState(profile?.pseudo || '')
  const [typeCompte, setTypeCompte] = useState(profile?.type_compte || 'particulier')
  const [checkState, setCheckState] = useState('idle') // idle | checking | available | taken | invalid | forbidden
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  // Validation live du pseudo
  useEffect(() => {
    if (!pseudo || pseudo === profile?.pseudo) {
      setCheckState('idle')
      return
    }
    if (pseudo.length < 3 || pseudo.length > 20 || !PSEUDO_RE.test(pseudo)) {
      setCheckState('invalid')
      return
    }
    setCheckState('checking')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      // Check modération d'abord
      try {
        const mod = await checkContent(pseudo)
        if (!mod.isClean) {
          setCheckState('forbidden')
          return
        }
      } catch (e) { /* si le check échoue, on ignore et laisse passer côté front */ }

      // Check unicité
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('pseudo', pseudo.trim())
        .neq('id', profile?.id || '')
        .maybeSingle()
      if (error) {
        console.error('[setup/pseudo check]', error)
        setCheckState('idle')
        return
      }
      setCheckState(data ? 'taken' : 'available')
    }, DEBOUNCE_MS)
    return () => clearTimeout(debounceRef.current)
  }, [pseudo, profile?.id, profile?.pseudo])

  async function handleContinue() {
    if (checkState === 'checking') return
    if (!pseudo.trim()) { toast.error('Choisis un pseudo'); return }
    if (checkState === 'invalid') { toast.error('3-20 caractères, lettres/chiffres/espaces/_'); return }
    if (checkState === 'taken') { toast.error('Ce pseudo est déjà pris'); return }
    if (checkState === 'forbidden') { toast.error('Ce pseudo n\'est pas autorisé'); return }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ pseudo: pseudo.trim(), type_compte: typeCompte })
        .eq('id', profile.id)
      if (error) {
        if (error.code === '23505' || error.message?.toLowerCase().includes('unique')) {
          toast.error('Ce pseudo est déjà pris')
          setCheckState('taken')
          return
        }
        throw error
      }
      setProfile({ ...profile, pseudo: pseudo.trim(), type_compte: typeCompte })
      navigate('/setup/localisation', { replace: true })
    } catch (err) {
      console.error('[setup/pseudo save]', err)
      toast.error('Erreur lors de la sauvegarde')
    } finally { setSaving(false) }
  }

  const canContinue = checkState === 'available' || (checkState === 'idle' && pseudo === profile?.pseudo && pseudo.length >= 3)

  // Messages d'état
  const stateInfo = {
    idle:       { color: '#8A8A9A', msg: pseudo ? 'Choisis un pseudo' : '3-20 caractères, lettres/chiffres/_' },
    checking:   { color: '#8A8A9A', msg: 'Vérification…' },
    available:  { color: '#059669', msg: '✓ Disponible' },
    taken:      { color: '#EF4444', msg: '✗ Déjà pris, essaie autre chose' },
    invalid:    { color: '#F59E0B', msg: '3-20 caractères — lettres, chiffres, espaces, _' },
    forbidden:  { color: '#EF4444', msg: '✗ Ce pseudo n\'est pas autorisé' },
  }[checkState]

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Ton pseudo" />
      <StepProgress current={2} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pb-10 overflow-y-auto"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#1A1A2E]">Choisis ton pseudo</h1>
          <p className="text-sm text-[#8A8A9A] mt-1">C'est le nom que les autres verront dans l'app.</p>
        </div>

        <div className="flex flex-col gap-1.5 mb-6">
          <label className="text-sm font-medium text-[#1A1A2E]">Pseudo</label>
          <div className="relative">
            <input
              type="text"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              placeholder="ex : mathis_33"
              maxLength={20}
              autoFocus
              className="w-full h-12 bg-[#F7F8FC] rounded-xl px-4 pr-10 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20"
            />
            {checkState === 'checking' && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#5B6BF5] border-t-transparent animate-spin" />
            )}
          </div>
          <p className="text-[12px]" style={{ color: stateInfo.color }}>{stateInfo.msg}</p>
        </div>

        {/* Type de compte */}
        <div className="flex flex-col gap-2 mb-6">
          <label className="text-sm font-medium text-[#1A1A2E]">Type de compte</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                key: 'particulier',
                emoji: '👤',
                label: 'Particulier',
                desc: "Pour des échanges entre voisins",
              },
              {
                key: 'pro',
                emoji: '🏪',
                label: 'Professionnel',
                desc: "Tu proposes tes services (jardinier, plombier…)",
              },
            ].map((t) => {
              const active = typeCompte === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTypeCompte(t.key)}
                  className="rounded-2xl border-2 p-3 flex flex-col gap-1 text-left transition-colors"
                  style={active
                    ? { borderColor: '#5B6BF5', background: 'linear-gradient(135deg, rgba(91,107,245,0.06), rgba(155,89,245,0.06))' }
                    : { borderColor: '#E8E8E8', background: '#fff' }}
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <span className="text-[13px] font-bold text-[#1A1A2E]">{t.label}</span>
                  <span className="text-[11px] text-[#8A8A9A] leading-snug">{t.desc}</span>
                </button>
              )
            })}
          </div>
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
