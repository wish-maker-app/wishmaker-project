import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Page Support — publique, accessible sans authentification.
 *
 * Existence exigée par Apple Developer Program ("publicly available
 * support URL"). Sert aussi de pré-requis légal (LCEN) côté coordonnées
 * de contact, et facilitera la conformité App Store / Play Store.
 *
 * Direction visuelle : minimalisme architectural avec une aurora Wish
 * Maker. Beaucoup d'air, ornements discrets, typographie respirée.
 * Mobile-first, scrollable nativement (min-h-screen).
 */
export default function Support() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-white text-[#1A1A2E] relative overflow-x-hidden antialiased">
      {/* ── Aurora background ── ornements signature Wish Maker */}
      <AuroraBackdrop />

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-[#EEEEF2]/80">
        <div className="max-w-[600px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-full text-[13px] font-medium text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors"
            aria-label="Retour"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }} />
            <span className="text-[12px] font-semibold tracking-wide text-[#8A8A9A]">wishmaker.fr</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[600px] mx-auto px-5 sm:px-8 pb-24">

        {/* ── Hero ── */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pt-14 sm:pt-20 pb-10"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EEEEF2] bg-white/80 backdrop-blur-sm mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[11.5px] font-semibold tracking-wide text-[#3A3A4E]">
              Notre équipe vous écoute
            </span>
          </div>

          <h1 className="text-[44px] sm:text-[56px] font-bold tracking-[-0.035em] leading-[1.02] mb-5">
            <span className="text-[#1A1A2E]">Comment</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 60%,#F59E0B 110%)' }}
            >
              pouvons-nous aider
            </span>
            <span className="text-[#1A1A2E]"> ?</span>
          </h1>

          <p className="text-[15.5px] sm:text-[16px] leading-[1.6] text-[#3A3A4E] max-w-[440px]">
            Une question, un problème, un retour&nbsp;? Écrivez-nous : nous lisons chaque message et nous vous répondons sous 48 heures ouvrées.
          </p>
        </motion.section>

        {/* ── Carte email — moment fort visuel ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <a
            href="mailto:contact@wishmaker.fr"
            className="group relative block rounded-[28px] overflow-hidden p-7 sm:p-9 text-white"
            style={{
              background: 'linear-gradient(135deg,#5B6BF5 0%,#7A65F0 45%,#9B59F5 100%)',
              boxShadow: '0 30px 60px -25px rgba(91,107,245,0.55), 0 12px 30px -15px rgba(155,89,245,0.4)',
            }}
          >
            {/* Halo interne */}
            <div
              className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-50 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35), transparent 65%)' }}
            />
            {/* Grain doux */}
            <div
              className="absolute inset-0 opacity-[0.07] pointer-events-none"
              style={{
                backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/></svg>")',
              }}
            />

            <div className="relative flex items-start gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11.5px] font-semibold tracking-[0.12em] uppercase text-white/70">
                  Email direct
                </p>
                <p className="mt-1 text-[20px] sm:text-[22px] font-bold tracking-[-0.015em] break-all">
                  contact@wishmaker.fr
                </p>
                <p className="mt-3 inline-flex items-center gap-2 text-[12.5px] font-medium text-white/80">
                  <span className="w-1 h-1 rounded-full bg-white/70" />
                  Réponse sous 48 heures ouvrées
                </p>
              </div>
            </div>

            <div className="relative mt-7 flex items-center justify-between pt-5 border-t border-white/15">
              <span className="text-[13px] font-medium text-white/90">Ouvrir mon client mail</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white text-[#5B6BF5] transition-transform duration-300 group-hover:translate-x-0.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </a>
        </motion.section>

        {/* ── Pour quoi nous contacter ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.02em]">
              Sujets fréquents
            </h2>
            <span className="text-[12px] font-semibold text-[#8A8A9A]">
              {REASONS.length} cas
            </span>
          </div>

          <ul className="flex flex-col divide-y divide-[#EEEEF2] -mx-2">
            {REASONS.map((r, i) => (
              <motion.li
                key={r.label}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.25 + i * 0.04 }}
                className="group px-2"
              >
                <a
                  href={`mailto:contact@wishmaker.fr?subject=${encodeURIComponent('[' + r.label + ']')}`}
                  className="flex items-center gap-4 py-4 hover:bg-[#F7F8FC]/60 rounded-2xl px-3 -mx-3 transition-colors"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: r.tint, color: r.accent }}
                  >
                    {r.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14.5px] font-semibold text-[#1A1A2E]">
                      {r.label}
                    </span>
                    <span className="block text-[12.5px] text-[#8A8A9A] mt-0.5 leading-relaxed">
                      {r.hint}
                    </span>
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#B0B0BE"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:stroke-[#5B6BF5]"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </a>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* ── Bloc société ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mb-14"
        >
          <div
            className="rounded-3xl p-6 sm:p-7 relative overflow-hidden"
            style={{ background: '#F7F8FC', border: '1px solid #EEEEF2' }}
          >
            {/* Liseré gradient vertical à gauche */}
            <span
              className="absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full"
              style={{ background: 'linear-gradient(180deg,#5B6BF5,#9B59F5)' }}
            />

            <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#8A8A9A]">
              Notre organisation
            </p>
            <p className="mt-3 text-[18px] font-bold tracking-[-0.015em] text-[#1A1A2E]">
              Wish Maker
            </p>
            <p className="mt-1 text-[13px] text-[#8A8A9A]">
              Société par actions simplifiée
            </p>
            <p className="mt-4 text-[13.5px] text-[#3A3A4E] leading-relaxed">
              770 Chemin de la Nebrale
              <br />
              81150 Labastide-de-Lévis
              <br />
              France
            </p>

            <button
              onClick={() => navigate('/mentions-legales')}
              className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#5B6BF5] hover:text-[#9B59F5] transition-colors group"
            >
              Voir les mentions légales
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </motion.section>

        {/* ── Footer mark ── */}
        <PageFooter />
      </main>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────

function AuroraBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      <div
        className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full blur-[120px] opacity-[0.35]"
        style={{ background: 'radial-gradient(circle, #9B59F5 0%, #5B6BF5 50%, transparent 75%)' }}
      />
      <div
        className="absolute top-[40%] -left-40 w-[420px] h-[420px] rounded-full blur-[120px] opacity-[0.18]"
        style={{ background: 'radial-gradient(circle, #F59E0B 0%, #F5C542 40%, transparent 75%)' }}
      />
    </div>
  )
}

function PageFooter() {
  const navigate = useNavigate()
  return (
    <footer className="pt-10 mt-4 border-t border-[#EEEEF2]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          />
          <span className="text-[12.5px] font-bold tracking-[-0.005em] text-[#1A1A2E]">Wish Maker</span>
          <span className="text-[11px] text-[#B0B0BE]">·</span>
          <span className="text-[11px] text-[#8A8A9A]">Wish Maker SAS</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-[12.5px] font-medium text-[#8A8A9A] hover:text-[#5B6BF5] transition-colors"
        >
          ← Retour à l'accueil
        </button>
      </div>
    </footer>
  )
}

// ──────────────────────────────────────────────
// Data : sujets de support
// ──────────────────────────────────────────────

const REASONS = [
  {
    label: 'Mon compte ou mon vœu',
    hint: 'Aide sur la connexion, le profil, ou un vœu publié',
    tint: 'linear-gradient(135deg,#EEF0FF,#E8E0FF)',
    accent: '#5B6BF5',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: 'Problème technique',
    hint: 'Bug, erreur, comportement inattendu de l\'application',
    tint: '#FFE7F2',
    accent: '#EC4899',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 9v2m0 4h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
  },
  {
    label: 'Paiement & facturation',
    hint: 'Question sur un règlement, un remboursement, Stripe',
    tint: '#DFF7E6',
    accent: '#22C55E',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    label: 'Signaler un contenu',
    hint: 'Comportement, message ou vœu inapproprié',
    tint: '#FFE6E4',
    accent: '#EF4444',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    label: 'Mes données (RGPD)',
    hint: 'Accès, rectification, effacement, portabilité',
    tint: '#F2E9FF',
    accent: '#9B59F5',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    label: 'Partenariats',
    hint: 'Vous portez un projet et souhaitez en discuter',
    tint: '#FFF6E0',
    accent: '#F59E0B',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
      </svg>
    ),
  },
]
