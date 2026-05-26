import { useNavigate } from 'react-router-dom'

/**
 * Page Support — publique, accessible sans authentification.
 *
 * Exigée par Apple Developer Program ("publicly available support URL")
 * + conformité LCEN (coordonnées de contact).
 *
 * Design volontairement sobre et utilitaire : c'est une page
 * d'information, pas une vitrine. Hiérarchie claire, typographie
 * lisible, pas d'ornements superflus.
 */
export default function Support() {
  const navigate = useNavigate()

  return (
    // fixed inset-0 + z-[1000] : on s'echappe du shell mobile 430px (#root)
    // pour que la page soit responsive desktop ET mobile. La zone main
    // scrolle son propre contenu (le shell global a overflow:hidden).
    <div
      className="fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >

      {/* Header — fixe en haut */}
      <header className="border-b border-[#EEEEF2] flex-shrink-0 bg-white/80 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1)
              else navigate('/')
            }}
            className="flex items-center gap-2 -ml-2 px-2 py-1.5 rounded-lg text-[13px] font-medium text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Retour
          </button>
          <span className="text-[12px] font-medium text-[#8A8A9A]">wishmaker.fr</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 py-10 sm:py-14">

        {/* Titre + intro */}
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight">
          Support
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
          Une question ou un problème ? Écrivez-nous, nous répondons sous 48 heures ouvrées.
        </p>

        {/* Bloc email */}
        <div className="mt-8 rounded-xl border border-[#EEEEF2] bg-[#F7F8FC] p-5">
          <p className="text-[12px] font-semibold text-[#8A8A9A] mb-1">
            Email de contact
          </p>
          <a
            href="mailto:wm@wishmaker.fr"
            className="text-[18px] font-semibold text-[#5B6BF5] hover:underline break-all"
          >
            wm@wishmaker.fr
          </a>
          <p className="mt-2 text-[13px] text-[#8A8A9A]">
            Réponse sous 48 heures ouvrées.
          </p>
        </div>

        {/* Sujets fréquents */}
        <section className="mt-12">
          <h2 className="text-[15px] font-bold text-[#1A1A2E] mb-4">
            Pour quoi nous contacter
          </h2>
          <ul className="flex flex-col gap-2 text-[14.5px] text-[#3A3A4E] leading-[1.55]">
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Question sur votre compte ou un vœu</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Problème technique avec l'application</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Question liée à un paiement</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Signaler un comportement ou un contenu inapproprié</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Demande relative à vos données personnelles (RGPD)</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-[#8A8A9A] mt-0.5">·</span>
              <span>Partenariats et collaborations</span>
            </li>
          </ul>
        </section>

        {/* Notre organisation */}
        <section className="mt-12">
          <h2 className="text-[15px] font-bold text-[#1A1A2E] mb-4">
            Notre organisation
          </h2>
          <div className="text-[14px] text-[#3A3A4E] leading-[1.7]">
            <p className="font-semibold text-[#1A1A2E]">Wish Maker</p>
            <p className="text-[#8A8A9A]">Société par actions simplifiée</p>
            <p className="mt-2">
              770 Chemin de la Nebrale
              <br />
              81150 Labastide-de-Lévis
              <br />
              France
            </p>
          </div>
          <button
            onClick={() => navigate('/mentions-legales')}
            className="mt-4 text-[13px] font-medium text-[#5B6BF5] hover:underline"
          >
            Voir les mentions légales →
          </button>
        </section>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-[#EEEEF2] flex items-center justify-between text-[12px] text-[#8A8A9A]">
            <span>Wish Maker SAS</span>
            <button
              onClick={() => navigate('/')}
              className="hover:text-[#5B6BF5] transition-colors"
            >
              ← Accueil
            </button>
          </footer>
        </div>
      </main>
    </div>
  )
}
