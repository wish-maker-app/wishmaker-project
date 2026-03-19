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

const schema = z.object({
  titre: z.string().min(5, 'Minimum 5 caractères').max(80, 'Maximum 80 caractères'),
  description: z.string().min(10, 'Minimum 10 caractères').max(500, 'Maximum 500 caractères'),
})

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
            initial={{ width: 0 }}
            animate={{ width: i < current ? '100%' : '0%' }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function Step1() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { titre, description, setStep1 } = useWishFormStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { titre, description },
  })

  const descValue = watch('description') || ''

  function onSubmit(data) {
    setStep1(data.titre, data.description)
    navigate('/wisher/create/2')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step1_titre')} onBack={() => navigate('/wisher')} />
      <StepProgress current={1} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-5 pt-2 pb-10 gap-5"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 flex-1">
          <Input
            label="Titre du vœu"
            placeholder={t('wisher.create.titre_placeholder')}
            {...register('titre')}
            error={errors.titre?.message}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-[#1A1A2E]">Description</label>
              <span className="text-xs text-[#8A8A9A]">{descValue.length}/500</span>
            </div>
            <textarea
              placeholder={t('wisher.create.description_placeholder')}
              rows={6}
              {...register('description')}
              className={`w-full bg-[#F5F5F7] rounded-[14px] px-4 py-3 text-[#1A1A2E] text-sm outline-none resize-none
                focus:ring-2 focus:ring-[#5B6BF5] border border-transparent focus:border-[#5B6BF5]
                transition-all placeholder-[#8A8A9A] ${errors.description ? 'border-red-400' : ''}`}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="mt-auto">
            <Button type="submit">{t('common.continuer')}</Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
