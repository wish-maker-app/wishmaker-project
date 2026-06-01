import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import lampeSvg from '../../assets/lampe.svg'
import genieSvg from '../../assets/genie.svg'

/**
 * Landing publique : homepage de wishmaker.fr.
 *
 * Servie aux visiteurs anonymes (par RouteResolver). Pour les users
 * connectes, on redirige directement vers /maker (zero friction).
 *
 * Style : minimalisme premium (Linear/Notion). Beaucoup d'espace, peu
 * d'ornement, palette restreinte. Le brand gradient apparait sur 1-2
 * mots cles seulement. Coherent avec /support et /mentions-legales.
 */
export default function Landing() {
  const navigate = useNavigate()
  const installRef = useRef(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  // Déjà installée (lancée en mode standalone) ? Calculé à l'init (pas de
  // setState synchrone dans l'effet → évite les renders en cascade).
  const [installed, setInstalled] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!(window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone)
  )
  const [showAndroidTuto, setShowAndroidTuto] = useState(false)

  // Capture l'event d'installation Android (PWA) dès le chargement — sinon le
  // bouton "Installer" Android n'aurait aucun prompt à déclencher au clic.
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e) }
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function scrollToInstall() {
    installRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleAndroidInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      try { await deferredPrompt.userChoice } catch { /* ignore */ }
      setDeferredPrompt(null)
    } else {
      // Pas de prompt dispo (déjà refusé, ou navigateur non compatible) → tuto
      setShowAndroidTuto(true)
    }
  }

  // Détection des contextes où l'installation iOS est impossible (webview in-app
  // ou Chrome iOS) → on invite à ouvrir la page dans Safari.
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isInAppWebview = /FBAN|FBAV|Instagram|Line|LinkedIn|Twitter/i.test(ua)

  return (
    // fixed inset-0 : on s'echappe du shell mobile 430px applique par #root
    // (cf index.css). La landing prend toute la largeur du viewport et est
    // responsive comme une vraie homepage. Position fixed sur Apple iOS = OK
    // car le composant unmount immediatement quand l'URL change (navigate
    // depuis les boutons Se connecter / S'inscrire).
    <div
      className="public-fixed-page fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >

      {/* ── Header sticky ── */}
      <header className="border-b border-[#EEEEF2] flex-shrink-0 bg-white/80 backdrop-blur-md z-10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={lampeSvg} alt="" className="w-6 h-6" />
            <span className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E]">Wish Maker</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/auth/login')}
              className="text-[13px] font-medium text-[#3A3A4E] hover:text-[#5B6BF5] transition-colors px-2 sm:px-3 py-1.5"
            >
              Se connecter
            </button>
            <button
              onClick={() => navigate('/auth')}
              className="text-[13px] font-semibold text-white px-3.5 sm:px-4 py-2 rounded-full transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', boxShadow: '0 2px 8px rgba(91,107,245,0.25)' }}
            >
              S'inscrire
            </button>
          </div>
        </div>
      </header>

      {/* ── Contenu scrollable ── */}
      <main className="flex-1 overflow-y-auto">

        {/* ━━━ Hero ━━━ */}
        <Section className="pt-12 sm:pt-24 pb-16 sm:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[720px] mx-auto text-center"
          >
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EEEEF2] bg-white mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-[11.5px] font-semibold tracking-wide text-[#3A3A4E]">
                Plateforme de mise en relation locale
              </span>
            </div>

            <h1 className="text-[36px] sm:text-[56px] font-bold tracking-[-0.035em] leading-[1.05] mb-5 sm:mb-6">
              <span className="text-[#1A1A2E]">Réalisez vos </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)' }}
              >
                vœux du quotidien
              </span>
            </h1>

            <div className="max-w-[560px] mx-auto mb-8 flex flex-col gap-3">
              <p className="text-[15.5px] sm:text-[17px] leading-[1.6] text-[#3A3A4E]">
                Un besoin, une envie, un dépannage ? Faites un vœu, un Maker près de chez vous l'exauce.
              </p>
              <p className="text-[13.5px] sm:text-[14px] leading-[1.6] text-[#8A8A9A]">
                Vous êtes Maker ? Exaucez les vœux autour de vous et gagnez des récompenses.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={scrollToInstall}
                className="w-full sm:w-auto h-12 px-7 rounded-full text-white font-semibold text-[14.5px] transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', boxShadow: '0 8px 24px rgba(91,107,245,0.3)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Télécharger l'application
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto h-12 px-7 rounded-full text-[#1A1A2E] font-semibold text-[14.5px] border border-[#E0E0E0] hover:border-[#5B6BF5] hover:text-[#5B6BF5] transition-colors"
              >
                Créer un compte gratuitement
              </button>
            </div>

            <p className="mt-6 text-[12px] text-[#8A8A9A]">
              3 vœux gratuits chaque mois · Aucune carte requise à l'inscription
            </p>
          </motion.div>
        </Section>

        {/* ━━━ Installation ━━━ */}
        <section ref={installRef} id="install" className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
            <SectionHeader
              eyebrow="Installation"
              title="Installez l'application"
              subtitle="Wish Maker s'installe directement depuis votre navigateur, sans passer par un store."
            />

            {installed ? (
              <div className="max-w-[520px] mx-auto rounded-3xl border border-[#A7F3D0] bg-[#ECFDF5] p-6 flex items-center justify-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <p className="text-[15px] font-semibold text-[#065F46]">Application déjà installée</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 max-w-[860px] mx-auto">

                {/* ── Bloc Android ── */}
                <div className="rounded-3xl border border-[#EEEEF2] bg-white p-6 sm:p-8 flex flex-col items-center text-center">
                  <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#E9F9F0' }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="#3DDC84" aria-hidden="true">
                      <path d="M6 18c0 .55.45 1 1 1h1v3.5a1.5 1.5 0 0 0 3 0V19h2v3.5a1.5 1.5 0 0 0 3 0V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8A1.5 1.5 0 0 0 2 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 3.5 8zm17 0a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 20.5 8zM15.53 2.16l1.3-1.3a.5.5 0 0 0-.7-.7l-1.48 1.48A5.96 5.96 0 0 0 12 1c-.96 0-1.86.22-2.66.62L7.86.14a.5.5 0 1 0-.7.7l1.3 1.3A5.99 5.99 0 0 0 6 7h12c0-2.02-1-3.8-2.47-4.84zM10 5.2a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4zm4 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4z"/>
                    </svg>
                  </span>
                  <p className="text-[16px] font-bold text-[#1A1A2E] mb-1">Installer sur Android</p>
                  <p className="text-[13.5px] text-[#3A3A4E] leading-[1.55] mb-5">Installation directe depuis Chrome, en un seul tap.</p>
                  <button
                    onClick={handleAndroidInstall}
                    className="w-full h-12 px-6 rounded-full text-white font-semibold text-[14.5px] transition-transform active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', boxShadow: '0 8px 24px rgba(91,107,245,0.3)' }}
                  >
                    Installer l'application
                  </button>
                  {showAndroidTuto && (
                    <div className="mt-4 w-full rounded-2xl bg-[#F7F8FC] border border-[#EEEEF2] p-4 text-left">
                      <p className="text-[13px] text-[#3A3A4E] leading-[1.55]">
                        Si rien ne se passe : ouvrez le menu <strong className="font-semibold text-[#1A1A2E]">⋮</strong> de Chrome,
                        puis <strong className="font-semibold text-[#1A1A2E]">« Ajouter à l'écran d'accueil »</strong>.
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Bloc Apple ── */}
                <div className="rounded-3xl border border-[#EEEEF2] bg-white p-6 sm:p-8 flex flex-col items-center text-center">
                  <span className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#F2F2F4' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="#1A1A2E" aria-hidden="true">
                      <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.89-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.88 2.63 3.22 2.58 1.29-.05 1.78-.83 3.34-.83 1.56 0 2 .83 3.37.81 1.39-.03 2.27-1.26 3.12-2.51.98-1.44 1.39-2.83 1.41-2.9-.03-.01-2.71-1.04-2.74-4.13zM14.6 4.7c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44z"/>
                    </svg>
                  </span>
                  <p className="text-[16px] font-bold text-[#1A1A2E] mb-1">Installer sur iPhone</p>
                  <p className="text-[13.5px] text-[#3A3A4E] leading-[1.55] mb-5">Depuis Safari ou Chrome, en trois étapes.</p>

                  {/* Avertissement UNIQUEMENT pour les webviews in-app (Instagram,
                      Facebook…) où l'ajout à l'écran d'accueil est réellement
                      impossible. Sur Chrome iOS la manip est la même que sur Safari
                      → on garde les étapes visibles (pas de blocage). */}
                  {isInAppWebview && (
                    <div className="w-full mb-3 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] p-4 text-left flex items-start gap-2.5">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      <p className="text-[13px] text-[#9A3412] leading-[1.5]">
                        Pour installer, ouvrez d'abord cette page dans <strong className="font-semibold">Safari</strong> ou <strong className="font-semibold">Chrome</strong> (menu ⋯ → « Ouvrir dans le navigateur »).
                      </p>
                    </div>
                  )}
                  <div className="w-full flex flex-col gap-2.5">
                    <AppleStep n="1" icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M6 12v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6"/></svg>
                    }>Touchez l'icône <strong className="font-semibold text-[#1A1A2E]">Partager</strong></AppleStep>
                    <AppleStep n="2" icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>
                    }>Choisissez <strong className="font-semibold text-[#1A1A2E]">« Sur l'écran d'accueil »</strong></AppleStep>
                    <AppleStep n="3" icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    }>Touchez <strong className="font-semibold text-[#1A1A2E]">« Ajouter »</strong></AppleStep>
                  </div>
                </div>

              </div>
            )}
          </div>
        </section>

        {/* ━━━ Comment ça marche ━━━ */}
        <Section className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <SectionHeader
            eyebrow="Comment ça marche"
            title="Simple des deux côtés"
            subtitle="Une plateforme, deux rôles. Vous pouvez être Wisher, Maker, ou les deux."
          />

          <div className="grid lg:grid-cols-2 gap-6 max-w-[960px] mx-auto">
            {/* Côté Wisher */}
            <div className="rounded-3xl bg-[#F7F8FC] p-6 sm:p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center">
                  <img src={lampeSvg} alt="" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#5B6BF5]">Wisher</p>
                  <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E]">J'ai un vœu à exaucer</p>
                </div>
              </div>

              <Step n="1" title="Publiez votre vœu">
                Décrivez ce dont vous avez besoin en 2 minutes : titre, mots-clés, lieu, et ajouter une éventuelle récompense pour motiver vos génies.
              </Step>
              <Step n="2" title="Les Makers répondent">
                Les Makers autour de vous voient votre vœu et vous écrivent. Vous choisissez celui qui vous convient.
              </Step>
              <Step n="3" title="Validez la réalisation">
                Une fois le vœu réalisé, vous le confirmez dans l'application. Le règlement se fait directement entre vous et le Maker.
              </Step>
            </div>

            {/* Côté Maker */}
            <div className="rounded-3xl bg-[#F7F8FC] p-6 sm:p-8 flex flex-col gap-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center">
                  <img src={genieSvg} alt="" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#9B59F5]">Maker</p>
                  <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E]">Je réalise des vœux</p>
                </div>
              </div>

              <Step n="1" title="Découvrez les vœux">
                Parcourez la carte autour de vous, filtrez par mots-clés (mécanique, jardinage, cours…) pour trouver ce qui vous correspond.
              </Step>
              <Step n="2" title="Proposez votre aide">
                Contactez le Wisher, échangez les détails, fixez un rendez-vous.
              </Step>
              <Step n="3" title="Réalisez et soyez payé">
                Une fois le vœu réalisé et validé, vous recevez votre récompense. Commission plateforme transparente.
              </Step>
            </div>
          </div>
        </Section>

        {/* ━━━ Catégories ━━━ */}
        <Section className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <SectionHeader
            eyebrow="Catégories"
            title="À chaque besoin sa solution"
            subtitle="Du dépannage le plus urgent au cours particulier, les Makers couvrent un large éventail."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-[960px] mx-auto">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[#EEEEF2] bg-white hover:border-[#D4DAFF] hover:shadow-[0_4px_18px_rgba(91,107,245,0.08)] transition-all"
              >
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)', color: '#5B6BF5' }}
                >
                  {cat.icon}
                </span>
                <span className="text-[13.5px] font-semibold text-[#1A1A2E]">{cat.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ━━━ Différenciateurs ━━━ */}
        <Section className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <SectionHeader
            eyebrow="Pourquoi Wish Maker"
            title="Pensé pour la confiance"
            subtitle="Quatre garanties qui font qu'on sécurise vos échanges, sans alourdir l'expérience."
          />

          <div className="grid sm:grid-cols-2 gap-4 max-w-[960px] mx-auto">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-3xl border border-[#EEEEF2] bg-white">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)', color: '#5B6BF5' }}
                >
                  {f.icon}
                </div>
                <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E] mb-1.5">{f.title}</p>
                <p className="text-[13.5px] text-[#3A3A4E] leading-[1.6]">{f.text}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ━━━ Tarifs ━━━ */}
        <Section className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <SectionHeader
            eyebrow="Tarifs"
            title="Gratuit par défaut"
            subtitle="3 vœux offerts chaque mois. Si vous en voulez plus, choisissez un pack, payé une fois et valable jusqu'à utilisation."
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-[960px] mx-auto">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className="rounded-3xl p-6 flex flex-col gap-3 relative"
                style={{
                  border: p.recommended ? '1.5px solid #5B6BF5' : '1px solid #EEEEF2',
                  background: p.recommended ? '#FAFBFF' : '#FFFFFF',
                  boxShadow: p.recommended ? '0 12px 32px -8px rgba(91,107,245,0.18)' : 'none',
                }}
              >
                {p.recommended && (
                  <span
                    className="absolute -top-2.5 left-5 text-[10px] font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                  >
                    Recommandé
                  </span>
                )}
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A8A9A]">{p.tag}</p>
                <p className="text-[18px] font-bold tracking-[-0.015em] text-[#1A1A2E]">{p.name}</p>
                <p className="text-[26px] font-bold tracking-[-0.025em] text-[#1A1A2E]">
                  {p.price}
                  <span className="text-[13px] font-semibold text-[#8A8A9A] ml-1">{p.priceSub}</span>
                </p>
                <p className="text-[12.5px] text-[#8A8A9A]">{p.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[12px] text-[#8A8A9A] text-center max-w-[560px] mx-auto">
            Le Maker reçoit l'intégralité de la récompense fixée par le Wisher. Wish Maker met en relation, le règlement se fait directement entre les deux personnes.
          </p>
        </Section>

        {/* ━━━ À propos ━━━ */}
        <Section className="py-16 sm:py-20 border-t border-[#EEEEF2]">
          <div className="max-w-[720px] mx-auto">
            <SectionHeader
              eyebrow="À propos"
              title="Construit en France, à taille humaine"
            />
            <div className="text-[14.5px] leading-[1.7] text-[#3A3A4E] flex flex-col gap-4">
              <p>
                Wish Maker est édité par <strong className="font-semibold text-[#1A1A2E]">Wish Maker SAS</strong>,
                société à mission locale basée dans le Tarn (81). Notre objectif : répondre à chaque besoin en
                privilégiant l'entraide et les talents locaux, là où les plateformes nationales sont trop éloignées
                de la vraie vie d'un quartier.
              </p>
              <p>
                Co-fondée par <strong className="font-semibold text-[#1A1A2E]">Christophe Simonin</strong> (Président)
                et <strong className="font-semibold text-[#1A1A2E]">Bastien Averous</strong> (Directeur général),
                la société est immatriculée au RCS d'Albi sous le numéro 104 364 047.
              </p>
              <p className="flex flex-col gap-1 pt-2">
                <span className="text-[12px] font-semibold text-[#8A8A9A] uppercase tracking-wide">Nous contacter</span>
                <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] font-semibold hover:underline">
                  wm@wishmaker.fr
                </a>
              </p>
            </div>
          </div>
        </Section>

        {/* ━━━ CTA final ━━━ */}
        <Section className="py-16 sm:py-24 border-t border-[#EEEEF2]">
          <div
            className="max-w-[860px] mx-auto rounded-[28px] p-8 sm:p-12 text-center text-white relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg,#5B6BF5 0%,#7A65F0 50%,#9B59F5 100%)',
              boxShadow: '0 30px 80px -25px rgba(91,107,245,0.5)',
            }}
          >
            <div
              className="absolute -top-32 -right-32 w-72 h-72 rounded-full opacity-30 pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 65%)' }}
            />
            <h2 className="relative text-[28px] sm:text-[36px] font-bold tracking-[-0.025em] leading-[1.1] mb-3">
              Prêt à exaucer votre premier vœu ?
            </h2>
            <p className="relative text-[15px] sm:text-[16px] text-white/85 max-w-[480px] mx-auto mb-7">
              Inscription gratuite. 3 vœux offerts pour démarrer. Pas d'engagement, pas d'abonnement.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="relative h-12 px-8 rounded-full bg-white text-[#5B6BF5] font-semibold text-[14.5px] transition-transform active:scale-[0.98] hover:shadow-xl"
            >
              Créer mon compte
            </button>
          </div>
        </Section>

        {/* ━━━ Footer ━━━ */}
        <footer className="border-t border-[#EEEEF2] py-8">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12.5px] text-[#8A8A9A]">
            <div className="flex items-center gap-2">
              <img src={lampeSvg} alt="" className="w-4 h-4 opacity-60" />
              <span className="font-semibold text-[#1A1A2E]">Wish Maker</span>
              <span className="text-[#D0D0D8]">·</span>
              <span>Wish Maker SAS</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button onClick={() => navigate('/support')} className="hover:text-[#5B6BF5] transition-colors">
                Support
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/mentions-legales')} className="hover:text-[#5B6BF5] transition-colors">
                Mentions légales
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/cgu')} className="hover:text-[#5B6BF5] transition-colors">
                CGU
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/cgv')} className="hover:text-[#5B6BF5] transition-colors">
                CGV
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/privacy')} className="hover:text-[#5B6BF5] transition-colors">
                Confidentialité
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <a href="mailto:wm@wishmaker.fr" className="hover:text-[#5B6BF5] transition-colors">
                wm@wishmaker.fr
              </a>
            </div>
          </div>
        </footer>

      </main>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────

function Section({ className = '', children }) {
  return (
    <section className={className}>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
        {children}
      </div>
    </section>
  )
}

function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="text-center max-w-[640px] mx-auto mb-10 sm:mb-14">
      {eyebrow && (
        <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#5B6BF5] mb-3">
          {eyebrow}
        </p>
      )}
      <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.025em] leading-[1.1] text-[#1A1A2E] mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[14.5px] sm:text-[15.5px] leading-[1.6] text-[#3A3A4E]">
          {subtitle}
        </p>
      )}
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-[#5B6BF5] bg-white"
      >
        {n}
      </span>
      <div>
        <p className="text-[14.5px] font-bold tracking-[-0.01em] text-[#1A1A2E] mb-0.5">{title}</p>
        <p className="text-[13.5px] text-[#3A3A4E] leading-[1.55]">{children}</p>
      </div>
    </div>
  )
}

// Étape d'installation iOS : numéro + petite icône + texte (section #install)
function AppleStep({ n, icon, children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#F7F8FC] border border-[#EEEEF2] px-4 py-3 text-left">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white flex items-center justify-center text-[12px] font-bold text-[#5B6BF5]">
        {n}
      </span>
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-[13px] text-[#3A3A4E] leading-[1.45]">{children}</span>
    </div>
  )
}

// ──────────────────────────────────────────────
// Data
// ──────────────────────────────────────────────

// Icone SVG line, 24x24, stroke=currentColor, cohérent avec le reste de l'app
const SI = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const CATEGORIES = [
  {
    label: 'Mécanique',
    icon: (
      <SI>
        <path d="M14.7 6.3a4 4 0 0 1 5 5L21 13l-1.6-1.6-2 2-2.4-2.4 2-2L15.4 7.3z" />
        <path d="M13.5 10.5 4 20l1.3 1.3a1.5 1.5 0 0 0 2.1 0L17 11.7" />
      </SI>
    ),
  },
  {
    label: 'Jardinage',
    icon: (
      <SI>
        <path d="M12 22V10" />
        <path d="M12 10c-3 0-6-3-6-6 3 0 6 3 6 6z" />
        <path d="M12 10c3 0 6-2 6-5-3 0-6 2-6 5z" />
        <path d="M9 22h6" />
      </SI>
    ),
  },
  {
    label: 'Ménage',
    icon: (
      <SI>
        <path d="M19 4 6 17" />
        <path d="m3 21 4-4" />
        <path d="m14 8 4 4" />
        <path d="M21 6c0-1-2-3-3-3" />
      </SI>
    ),
  },
  {
    label: 'Déménagement',
    icon: (
      <SI>
        <path d="M3 9.5 12 4l9 5.5" />
        <path d="M3 9.5V20a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9.5" />
        <path d="M3 9.5h18" />
        <path d="M10 14h4" />
      </SI>
    ),
  },
  {
    label: 'Livraison',
    icon: (
      <SI>
        <path d="M2 17h2l1.5-5h10L18 17h3" />
        <circle cx="8" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M8 12V7h6l2 2" />
      </SI>
    ),
  },
  {
    label: 'Bricolage',
    icon: (
      <SI>
        <path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" />
        <path d="M17.6 6.4 21 3l-1.5-1.5L16 5l-1 3 2.6-1.6z" />
        <path d="m12 9 5 5" />
      </SI>
    ),
  },
  {
    label: "Garde d'enfants",
    icon: (
      <SI>
        <circle cx="12" cy="6" r="3" />
        <path d="M9.5 11.5 8 14l1.5 1.5L9 18h6l-.5-2.5L16 14l-1.5-2.5" />
        <path d="M10 21v-3" />
        <path d="M14 21v-3" />
      </SI>
    ),
  },
  {
    label: "Garde d'animaux",
    icon: (
      <SI>
        <circle cx="6" cy="11" r="2" />
        <circle cx="18" cy="11" r="2" />
        <circle cx="9" cy="6" r="2" />
        <circle cx="15" cy="6" r="2" />
        <path d="M9 13c-2 0-4 1.5-4 4 0 2 2 3 4 3h6c2 0 4-1 4-3 0-2.5-2-4-4-4z" />
      </SI>
    ),
  },
  {
    label: 'Cours particuliers',
    icon: (
      <SI>
        <path d="M4 5.5c2.5-.5 5 0 8 2 3-2 5.5-2.5 8-2v12.5c-2.5-.5-5 0-8 2-3-2-5.5-2.5-8-2V5.5z" />
        <path d="M12 7.5v12" />
      </SI>
    ),
  },
  {
    label: 'Bien-être',
    icon: (
      <SI>
        <path d="M12 9.5c-1.3-2-4.5-2-5.5.5-.9 2.3 1.2 4.3 5.5 7 4.3-2.7 6.4-4.7 5.5-7-1-2.5-4.2-2.5-5.5-.5z" />
        <path d="M4 14.5c.8 2.5 3 4.5 8 6 5-1.5 7.2-3.5 8-6" />
      </SI>
    ),
  },
  {
    label: 'Cuisine',
    icon: (
      <SI>
        <path d="M6 13.5V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6.5" />
        <path d="M6 13.5a4 4 0 1 1 0-7 4 4 0 0 1 5-3 4 4 0 0 1 7 2.5 4 4 0 0 1 0 7.5" />
        <path d="M9 16h6" />
      </SI>
    ),
  },
  {
    label: 'Animation',
    icon: (
      <SI>
        <path d="M5 19 8 9l6 6-9 4z" />
        <path d="M13 5 14 7l2 .5L14.5 9 15 11l-2-1-2 1 .5-2L10 7.5 12 7z" />
        <path d="M19 11l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
      </SI>
    ),
  },
]

const FEATURES = [
  {
    title: 'Hyperlocal',
    text: 'Les Makers sont littéralement dans votre quartier, pas à 30 km. Carte interactive, distance précise, calcul d\'itinéraire.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Mise en relation simple',
    text: 'Wish Maker met en relation Wishers et Makers. Le règlement de la récompense se fait directement entre les deux personnes, en toute liberté.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="3" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    title: 'Modération automatique',
    text: 'Photos, descriptions et messages sont automatiquement analysés pour bloquer le contenu inapproprié ou les tentatives de contournement.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Mode Urgent',
    text: 'Besoin d\'aide tout de suite ? Le mode Urgent met votre vœu en avant pendant 24h. Les Makers les plus proches sont notifiés en priorité.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
]

const PRICING = [
  { tag: 'Gratuit', name: 'Découverte', price: '0€', priceSub: '/mois', detail: '3 vœux gratuits chaque mois, renouvelés automatiquement.' },
  { tag: 'Pack', name: 'Starter', price: '2,99€', priceSub: '', detail: '+3 vœux supplémentaires, valables jusqu\'à utilisation.' },
  { tag: 'Pack', name: 'Essentiel', price: '5,99€', priceSub: '', detail: '+7 vœux. Le plus populaire pour un usage régulier.', recommended: true },
  { tag: 'Pack', name: 'Pro', price: '9,99€', priceSub: '', detail: '+15 vœux. Idéal pour les utilisateurs très actifs ou les pros.' },
]
