import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Page Support — publique, accessible sans authentification.
 *
 * Existence exigée par Apple Developer Program ("publicly available
 * support URL"). Sert aussi de pré-requis légal (LCEN) côté coordonnées
 * de contact, et facilitera la conformité App Store / Play Store.
 *
 * Volontairement minimaliste et statique : pas de formulaire (l'email
 * direct est plus fiable), pas de FAQ pour le moment (à enrichir plus
 * tard quand on aura des questions récurrentes).
 */
export default function Support() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[480px] flex flex-col gap-8"
      >
        {/* Header */}
        <header className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#F5F5F7]"
            aria-label="Retour"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-[12px] font-semibold text-[#8A8A9A]">wishmaker.fr</span>
        </header>

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3 pt-6">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-2"
            style={{ background: 'linear-gradient(135deg,#EEF0FF,#E8E0FF)' }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-[-0.02em]">Support</h1>
          <p className="text-[14px] text-[#8A8A9A] leading-relaxed max-w-[360px]">
            Une question, un problème, un retour ? Notre équipe est à votre disposition pour vous accompagner.
          </p>
        </div>

        {/* Bloc contact principal */}
        <section
          className="rounded-3xl p-6 flex flex-col gap-4"
          style={{ background: 'linear-gradient(135deg,#F7F8FC,#EEF0FF)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-[#8A8A9A] mb-1">Nous contacter par email</p>
              <a
                href="mailto:contact@wishmaker.fr"
                className="text-[16px] font-bold text-[#1A1A2E] hover:text-[#5B6BF5] transition-colors break-all"
              >
                contact@wishmaker.fr
              </a>
              <p className="text-[12px] text-[#8A8A9A] mt-2 leading-relaxed">
                Nous répondons généralement sous <strong>48 heures ouvrées</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Ce que vous pouvez nous demander */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Pour quoi nous contacter ?</h2>
          <ul className="flex flex-col gap-2 text-[14px] text-[#1A1A2E]">
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Question sur votre compte ou votre vœu</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Problème technique avec l'application</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Question liée à un paiement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Signaler un comportement ou un contenu inapproprié</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Demande relative à vos données personnelles (RGPD)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#5B6BF5] mt-0.5">•</span>
              <span>Partenariats et collaborations</span>
            </li>
          </ul>
        </section>

        {/* Bloc société */}
        <section className="rounded-2xl border border-[#EEEEF2] p-5">
          <p className="text-[12px] font-semibold text-[#8A8A9A] mb-2">Notre organisation</p>
          <p className="text-[14px] font-bold text-[#1A1A2E]">Wish Maker</p>
          <p className="text-[13px] text-[#8A8A9A] leading-relaxed mt-1">
            Société par actions simplifiée
            <br />
            770 Chemin de la Nebrale
            <br />
            81150 Labastide-de-Lévis, France
          </p>
          <button
            onClick={() => navigate('/mentions-legales')}
            className="mt-3 text-[12px] font-semibold text-[#5B6BF5] hover:underline"
          >
            Voir les mentions légales →
          </button>
        </section>

        {/* CTA retour */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => navigate('/')}
            className="text-[13px] font-semibold text-[#8A8A9A] hover:text-[#5B6BF5] transition-colors"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  )
}
