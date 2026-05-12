import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import lampeSvg from '../../assets/lampe.svg'
import genieSvg from '../../assets/genie.svg'

/**
 * Layout split editorial pour toutes les pages /auth/*.
 *
 * - Mobile (<lg) : seulement la colonne droite, prend toute la viewport.
 *   Les pages enfants conservent leur design mobile-first (header, form,
 *   bg eventuel).
 * - Desktop (lg+) : split asymetrique. Gauche FIXE = panneau brand
 *   editorial avec aurora gradient + tagline + illustration + proof
 *   points. Droite SCROLLABLE = formulaire (children).
 *
 * Le wrapper s'echappe du shell global #root 430px (fixed inset-0
 * z-[1000]) pour occuper toute la viewport — necessaire pour le split
 * desktop fonctionne.
 */
export default function AuthShell({ children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] overflow-hidden bg-white"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >
      <div className="h-full w-full flex">

        {/* ──── GAUCHE : panneau brand (desktop only) ──── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-[44%] xl:w-[45%] relative border-r border-[#EEEEF2] bg-[#FBFBFE]">
          <BrandAurora />

          <div className="relative z-10 flex-1 flex flex-col justify-between p-10 xl:p-14 2xl:p-16 max-h-screen overflow-hidden">
            <BrandHeader />
            <BrandCenter />
            <BrandFooter />
          </div>
        </aside>

        {/* ──── DROITE : page form, scrollable ──── */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Brand panel (left, desktop only)
// ──────────────────────────────────────────────

function BrandHeader() {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2.5 group"
        aria-label="Accueil Wish Maker"
      >
        <span
          className="w-9 h-9 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)' }}
        >
          <img src={lampeSvg} alt="" className="w-5 h-5" />
        </span>
        <span className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E]">
          Wish Maker
        </span>
      </button>
    </div>
  )
}

function BrandCenter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-7 max-w-[480px]"
    >
      {/* Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EEEEF2] bg-white/70 backdrop-blur-sm w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        <span className="text-[11.5px] font-semibold tracking-wide text-[#3A3A4E]">
          La plateforme des coups de main locaux
        </span>
      </div>

      {/* Tagline editorial */}
      <h2 className="text-[36px] xl:text-[44px] 2xl:text-[52px] font-bold tracking-[-0.035em] leading-[1.05] text-[#1A1A2E]">
        Réalisez vos{' '}
        <span
          className="bg-clip-text text-transparent"
          style={{ backgroundImage: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)' }}
        >
          vœux du quotidien
        </span>
        .
      </h2>

      {/* Sub */}
      <p className="text-[15px] xl:text-[16px] leading-[1.6] text-[#3A3A4E] max-w-[420px]">
        Vos besoins du jour, exaucés par les Makers à côté de chez vous.
        Une carte, vos voisins, et tout s'arrange.
      </p>

      {/* Illustration composite : génie en grand + lampe en accent */}
      <div className="relative mt-2 self-start" style={{ width: 240, height: 240 }}>
        {/* Aurora glow halo */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-35 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, #9B59F5 0%, #5B6BF5 35%, transparent 70%)' }}
        />
        {/* Génie : centré, légèrement décalé */}
        <img
          src={genieSvg}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ filter: 'drop-shadow(0 24px 48px rgba(91,107,245,0.25))' }}
        />
        {/* Lampe : petit accent en overlap top-right */}
        <img
          src={lampeSvg}
          alt=""
          className="absolute"
          style={{
            top: -20,
            right: -8,
            width: 84,
            height: 84,
            filter: 'drop-shadow(0 12px 32px rgba(155,89,245,0.35))',
          }}
        />
      </div>
    </motion.div>
  )
}

function BrandFooter() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-2.5"
    >
      <ProofRow
        bg="linear-gradient(135deg,#EEF0FF,#F2E9FF)"
        fg="#5B6BF5"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
        }
        title="Hyperlocal"
        text="les Makers sont à 2 rues, pas à 20 km."
      />
      <ProofRow
        bg="linear-gradient(135deg,#DFF7E6,#DFF7F3)"
        fg="#0F8A4A"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        }
        title="Paiement sécurisé"
        text="pré-autorisé Stripe, libéré à validation."
      />
      <ProofRow
        bg="linear-gradient(135deg,#FFF6E0,#FFEED9)"
        fg="#B07700"
        icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.95" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        }
        title="Gratuit pour démarrer"
        text="3 vœux offerts chaque mois."
      />
    </motion.div>
  )
}

function ProofRow({ bg, fg, icon, title, text }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: bg, color: fg }}
      >
        {icon}
      </span>
      <p className="text-[12.5px] leading-[1.55] text-[#3A3A4E]">
        <strong className="text-[#1A1A2E] font-semibold">{title}</strong> · {text}
      </p>
    </div>
  )
}

// ──────────────────────────────────────────────
// Aurora background
// ──────────────────────────────────────────────

function BrandAurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Blob principal purple */}
      <div
        className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-[110px] opacity-30"
        style={{ background: 'radial-gradient(circle, #9B59F5 0%, #5B6BF5 50%, transparent 75%)' }}
      />
      {/* Blob secondaire amber, en bas */}
      <div
        className="absolute -bottom-32 -left-24 w-[360px] h-[360px] rounded-full blur-[110px] opacity-20"
        style={{ background: 'radial-gradient(circle, #F59E0B 0%, #F5C542 40%, transparent 75%)' }}
      />
      {/* Trame subtile */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(#5B6BF5 1px, transparent 1px), linear-gradient(90deg, #5B6BF5 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  )
}
