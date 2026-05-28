import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import useWishFormStore from '../../../store/wishFormStore'
import { checkContent } from '../../../lib/moderation'
import { useCatalog } from '../../../hooks/useTags'

// Schema-factory : on crée le schema à chaque render avec les messages traduits
function buildSchema(t) {
  return z.object({
    titre: z.string().min(5, t('wisher.create.step1.min5')).max(80, t('wisher.create.step1.max80')),
    description: z.string().min(10, t('wisher.create.step1.min10')).max(500, t('wisher.create.step1.max500')),
  })
}

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

export default function Step1() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { titre, description, setStep1 } = useWishFormStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(buildSchema(t)),
    defaultValues: { titre, description },
  })

  const titreValue = watch('titre') || ''
  const descValue = watch('description') || ''
  const [titreViolation, setTitreViolation] = useState(false)
  const [descViolation, setDescViolation] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // Touche useCatalog dès Step1 → categories+tags pré-cachés en mémoire,
  // dispo instantanément à Step2/Step4 (au lieu de recharger à chaque mount).
  useCatalog()

  // NOTE: le prewarm NSFW.js (40Mo de TensorFlow.js) est DEPLACE dans Step2,
  // au moment ou l'user arrive sur l'ecran d'upload photo. Ca evite de charger
  // 40Mo pour rien chez les users qui postent sans photo (~moitie des cas).

  const checkModeration = useCallback(async () => {
    const [titreCheck, descCheck] = await Promise.all([
      checkContent(titreValue),
      checkContent(descValue),
    ])
    setTitreViolation(!titreCheck.isClean)
    setDescViolation(!descCheck.isClean)
  }, [titreValue, descValue])

  useEffect(() => {
    const timer = setTimeout(checkModeration, 300)
    return () => clearTimeout(timer)
  }, [checkModeration])

  const hasViolation = titreViolation || descViolation

  async function onSubmit(data) {
    if (submitting) return // anti-double-clic
    setSubmitting(true)
    try {
      // Si le live-check (debounce 300ms) n'a vu aucune violation ET que
      // les valeurs n'ont pas changé entre-temps → on skip le double-check
      // synchrone → navigation instantanée.
      const sameAsLive = data.titre === titreValue && data.description === descValue
      if (sameAsLive && !hasViolation) {
        setStep1(data.titre, data.description)
        navigate('/wisher/create/2')
        return
      }
      // Sinon (edge case : submission très rapide avant le debounce) → re-check
      const [titreCheck, descCheck] = await Promise.all([
        checkContent(data.titre),
        checkContent(data.description),
      ])
      if (!titreCheck.isClean || !descCheck.isClean) {
        setTitreViolation(!titreCheck.isClean)
        setDescViolation(!descCheck.isClean)
        return
      }
      setStep1(data.titre, data.description)
      navigate('/wisher/create/2')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step1_titre')} onBack={() => navigate('/wisher')} />
      <StepProgress current={1} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-5 pt-2 pb-10 gap-5"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 flex-1">
          <Input
            label={t('wisher.create.step1.label_titre')}
            placeholder={t('wisher.create.titre_placeholder')}
            {...register('titre')}
            error={titreViolation ? t('wisher.create.step1.violation') : errors.titre?.message}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#1A1A2E]">{t('wisher.create.step1.label_desc')}</label>
              <span className="text-xs text-[#8A8A9A]">{descValue.length}/500</span>
            </div>
            <textarea
              placeholder={t('wisher.create.description_placeholder')}
              rows={6}
              {...register('description')}
              className={`w-full bg-[#F5F5F7] rounded-[14px] px-4 py-3 text-[#1A1A2E] text-sm outline-none resize-none
                focus:ring-2 focus:ring-[#5B6BF5] border border-transparent focus:border-[#5B6BF5]
                transition-all placeholder-[#8A8A9A] ${errors.description || descViolation ? 'border-red-400' : ''}`}
            />
            {(descViolation || errors.description) && (
              <p className="text-xs text-red-500">
                {descViolation ? t('wisher.create.step1.violation') : errors.description.message}
              </p>
            )}
          </div>

          <div className="mt-auto">
            <Button type="submit" disabled={hasViolation} loading={submitting}>
              {t('common.continuer')}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
