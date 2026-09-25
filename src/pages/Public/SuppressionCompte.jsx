import { useNavigate } from 'react-router-dom'

/**
 * Page « Supprimer mon compte » — publique, accessible sans authentification.
 *
 * Exigée par Google Play (Sécurité des données) : une URL web permettant à un
 * utilisateur de demander la suppression de son compte et des données associées,
 * y compris s'il n'a plus accès à l'application. Conforme RGPD (droit à
 * l'effacement).
 */
export default function SuppressionCompte() {
  const navigate = useNavigate()

  return (
    <div
      className="public-fixed-page fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >
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

          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight">
            Supprimer mon compte
          </h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
            Vous pouvez supprimer votre compte Wish Maker et les données associées à tout moment,
            de deux façons.
          </p>

          {/* Méthode 1 — in-app */}
          <h2 className="mt-10 text-[18px] font-bold">1. Depuis l'application</h2>
          <ol className="mt-3 flex flex-col gap-2 text-[15px] leading-[1.6] text-[#3A3A4E] list-decimal pl-5">
            <li>Ouvrez l'application Wish Maker et connectez-vous.</li>
            <li>Allez dans l'onglet <strong>Profil</strong>.</li>
            <li>Appuyez sur <strong>« Supprimer mon compte »</strong>, puis confirmez.</li>
          </ol>
          <p className="mt-3 text-[14px] text-[#8A8A9A]">La suppression est effectuée immédiatement.</p>

          {/* Méthode 2 — email */}
          <h2 className="mt-10 text-[18px] font-bold">2. Par e-mail</h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
            Si vous n'avez plus accès à l'application, envoyez une demande depuis l'adresse e-mail
            associée à votre compte, avec pour objet <strong>« Suppression de compte »</strong> :
          </p>
          <div className="mt-4 rounded-xl border border-[#EEEEF2] bg-[#F7F8FC] p-5">
            <p className="text-[12px] font-semibold text-[#8A8A9A] mb-1">Adresse de contact</p>
            <a href="mailto:contact@wishmaker.fr?subject=Suppression%20de%20compte"
              className="text-[16px] font-semibold text-[#5B6BF5]">
              contact@wishmaker.fr
            </a>
          </div>
          <p className="mt-3 text-[14px] text-[#8A8A9A]">
            Votre demande est traitée sous 30 jours maximum.
          </p>

          {/* Suppression partielle */}
          <h2 className="mt-10 text-[18px] font-bold">Supprimer certaines données sans supprimer votre compte</h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
            Vous pouvez supprimer une partie de vos données tout en conservant votre compte :
          </p>
          <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-[1.6] text-[#3A3A4E] list-disc pl-5">
            <li><strong>Vos vœux</strong> : ouvrez le vœu, menu « ⋯ » → « Supprimer ce vœu » (ses photos sont supprimées avec lui).</li>
            <li><strong>Vos conversations</strong> : ouvrez la conversation, menu « ⋯ » → « Supprimer la conversation ».</li>
            <li><strong>Votre photo et vos informations de profil</strong> : onglet Profil → « Profil », puis modifiez ou retirez votre photo et vos informations.</li>
            <li><strong>Toute autre donnée</strong> : écrivez à <a href="mailto:contact@wishmaker.fr?subject=Suppression%20de%20donn%C3%A9es" className="text-[#5B6BF5] font-medium">contact@wishmaker.fr</a> avec pour objet « Suppression de données », en précisant les données concernées. Traitement sous 30 jours maximum.</li>
          </ul>

          {/* Données concernées */}
          <h2 className="mt-10 text-[18px] font-bold">Données supprimées avec le compte</h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
            La suppression entraîne l'effacement de votre compte et des données associées :
            profil (nom, pseudo, photo), vœux publiés, messages, photos et données de localisation.
          </p>
          <p className="mt-3 text-[15px] leading-[1.6] text-[#3A3A4E]">
            Certaines données peuvent être conservées pour la durée strictement nécessaire au respect
            de nos obligations légales (par exemple les justificatifs de transaction, à des fins
            comptables et fiscales), puis supprimées.
          </p>

          <p className="mt-10 text-[13px] text-[#8A8A9A]">
            Pour en savoir plus, consultez notre{' '}
            <button onClick={() => navigate('/privacy')} className="text-[#5B6BF5] font-medium">
              politique de confidentialité
            </button>.
          </p>
        </div>
      </main>
    </div>
  )
}
