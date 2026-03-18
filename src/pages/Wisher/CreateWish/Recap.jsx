import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'
import { useWishes } from '../../../hooks/useWishes'

function Section({ icon, label, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold text-[#8A8A9A] uppercase tracking-wide">{label}</span>
      </div>
      {children}
    </div>
  )
}

export default function Recap() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { titre, description, images, adresse, latitude, longitude, tags, reset } = useWishFormStore()
  const { createWish, loading: publishing } = useWishes()
  const [error, setError] = useState(null)

  async function handlePublish() {
    setError(null)
    try {
      await createWish({ titre, description, latitude, longitude, adresse, tags, images })
      reset()
      navigate('/wisher/create/success')
    } catch (err) {
      setError(err.message || 'Erreur lors de la publication')
    }
  }

  const cover = images.find((img) => img.is_cover) || images[0]

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header title="Récapitulatif" onBack={() => navigate('/wisher/create/4')} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-5 pt-2 pb-10 flex flex-col gap-4"
      >
        {/* Cover image */}
        {cover && (
          <div className="w-full h-48 rounded-2xl overflow-hidden">
            <img src={cover.preview} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Titre + description */}
        <Section icon="✨" label="Votre vœu">
          <h2 className="text-base font-bold text-[#1A1A2E]">{titre || '—'}</h2>
          <p className="text-sm text-[#8A8A9A] leading-relaxed">{description || '—'}</p>
        </Section>

        {/* Photos */}
        <Section icon="📷" label={`Photos (${images.length})`}>
          {images.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <div key={img.id} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8A8A9A]">Aucune photo</p>
          )}
        </Section>

        {/* Localisation */}
        <Section icon="📍" label="Localisation">
          <p className="text-sm font-medium text-[#1A1A2E]">{adresse || 'Non renseignée'}</p>
        </Section>

        {/* Tags */}
        <Section icon="🏷️" label="Mots-clés">
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#8A8A9A]">Aucun mot-clé</p>
          )}
        </Section>

        {/* Modifier les étapes */}
        <div className="flex gap-2">
          {[
            { label: 'Modifier le vœu', path: '/wisher/create/1' },
            { label: 'Photos', path: '/wisher/create/2' },
            { label: 'Lieu', path: '/wisher/create/3' },
          ].map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="flex-1 py-2 rounded-xl border border-[#E0E0E0] text-xs font-medium text-[#5B6BF5] bg-white">
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <Button onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publication...' : t('wisher.create.publier')}
        </Button>
      </motion.div>
    </div>
  )
}
