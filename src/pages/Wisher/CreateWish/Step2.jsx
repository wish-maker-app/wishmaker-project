import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-4">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < current - 1
        const isCurrent = i === current - 1
        return (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
            {isCompleted ? (
              <div
                className="h-full w-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
              />
            ) : (
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
                initial={{ width: 0 }}
                animate={{ width: isCurrent ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Step2() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { images, setImages } = useWishFormStore()
  const inputRef = useRef()

  function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 photos')
      return
    }
    const newImages = files.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      preview: URL.createObjectURL(file),
      is_cover: images.length === 0 && i === 0,
      ordre: images.length + i,
    }))
    setImages([...images, ...newImages])
    e.target.value = ''
  }

  function setCover(id) {
    setImages(images.map((img) => ({ ...img, is_cover: img.id === id })))
  }

  function remove(id) {
    const filtered = images.filter((img) => img.id !== id)
    // Si on supprime la cover, on met la première comme cover
    if (filtered.length > 0 && !filtered.some((img) => img.is_cover)) {
      filtered[0].is_cover = true
    }
    setImages(filtered)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step2_titre')} onBack={() => navigate('/wisher/create/1')} />
      <StepProgress current={2} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-5 pt-2 pb-10 gap-5"
      >
        <p className="text-sm text-[#8A8A9A]">
          Ajoutez au moins 1 photo (max 5). La première sera la photo principale.
        </p>

        {/* Grille de photos */}
        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {images.map((img) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="relative aspect-square rounded-2xl overflow-hidden bg-[#F5F5F7]"
              >
                <img src={img.preview} alt="" className="w-full h-full object-cover" />

                {/* Badge cover */}
                {img.is_cover && (
                  <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                    Cover
                  </div>
                )}

                {/* Actions overlay */}
                <div className="absolute inset-0 bg-black/20 flex items-end justify-between p-1.5">
                  {!img.is_cover && (
                    <button onClick={() => setCover(img.id)}
                      className="text-[10px] font-semibold bg-white/90 text-[#5B6BF5] px-2 py-1 rounded-full">
                      Cover
                    </button>
                  )}
                  <button onClick={() => remove(img.id)}
                    className="ml-auto w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#E53E3E">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Bouton ajouter */}
          {images.length < 5 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-2xl border-2 border-dashed border-[#D0D0E0] bg-[#F5F5F7]
                flex flex-col items-center justify-center gap-1.5"
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#5B6BF5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[10px] font-medium text-[#8A8A9A]">Ajouter</span>
            </motion.button>
          )}
        </div>

        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />

        <div className="mt-auto flex flex-col gap-3">
          <Button
            onClick={() => {
              if (images.length === 0) {
                toast.error('Veuillez ajouter une image')
                return
              }
              navigate('/wisher/create/3')
            }}
          >
            {t('common.continuer')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
