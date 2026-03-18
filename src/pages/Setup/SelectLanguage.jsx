import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import i18n from '../../lib/i18n'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import useOnboardingStore from '../../store/onboardingStore'

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', region: 'France' },
  { code: 'en', label: 'English',  flag: '🇺🇸', region: 'United States' },
]

export default function SelectLanguage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { langue, setLangue } = useOnboardingStore()
  const [selected, setSelected] = useState(langue || 'fr')

  function handleSelect(code) {
    setSelected(code)
    setLangue(code)
    i18n.changeLanguage(code)
    localStorage.setItem('wishmaker-lang', code)
  }

  function handleContinue() {
    navigate('/setup/localisation')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title={t('setup.langue.titre')} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-4 pb-10 gap-6"
      >
        <p className="text-[#8A8A9A] text-sm">{t('setup.langue.label')}</p>

        <div className="flex flex-col gap-3">
          {LANGUAGES.map((lang) => {
            const isActive = selected === lang.code
            return (
              <motion.button
                key={lang.code}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelect(lang.code)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: isActive ? '#5B6BF5' : '#E0E0E0',
                  background: isActive
                    ? 'linear-gradient(135deg, #5B6BF5, #9B59F5)'
                    : '#F5F5F7',
                }}
              >
                <span className="text-4xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-base ${isActive ? 'text-white' : 'text-[#1A1A2E]'}`}>
                    {lang.label}
                  </p>
                  <p className={`text-sm ${isActive ? 'text-white/70' : 'text-[#8A8A9A]'}`}>
                    {lang.region}
                  </p>
                </div>
                {isActive && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.3" />
                    <path d="M7 12l3.5 3.5L17 8.5" stroke="white" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </motion.button>
            )
          })}
        </div>

        <div className="mt-auto">
          <Button onClick={handleContinue}>{t('setup.langue.btn')}</Button>
        </div>
      </motion.div>
    </div>
  )
}
