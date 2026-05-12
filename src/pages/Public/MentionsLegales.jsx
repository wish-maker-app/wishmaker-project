import { useNavigate } from 'react-router-dom'

/**
 * Page Mentions légales — publique, accessible sans authentification.
 *
 * Obligatoire LCEN 2004 art. 6 III. Informations sourcées de l'Extrait
 * Kbis (SAS Wish Maker, RCS Albi 104 364 047).
 *
 * Design sobre, utilitaire, optimisé pour la lecture.
 */
export default function MentionsLegales() {
  const navigate = useNavigate()

  return (
    // fixed inset-0 + z-[1000] : on s'echappe du shell mobile 430px (#root)
    // pour que la page soit responsive desktop ET mobile.
    <div
      className="fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >

      {/* Header — fixe en haut */}
      <header className="border-b border-[#EEEEF2] flex-shrink-0 bg-white/80 backdrop-blur-md">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
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
        <div className="max-w-[680px] mx-auto px-5 sm:px-6 py-10 sm:py-14">

        {/* Titre */}
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight">
          Mentions légales
        </h1>
        <p className="mt-2 text-[13px] text-[#8A8A9A]">
          Dernière mise à jour : mai 2026
        </p>

        {/* Sections */}
        <div className="mt-10 flex flex-col gap-10">

          <Section title="1. Éditeur du site">
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Wish Maker</strong>
              <br />
              Société par actions simplifiée (SAS) au capital de 1 000,00&nbsp;€
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Siège social</strong>
              <br />
              770 Chemin de la Nebrale
              <br />
              81150 Labastide-de-Lévis, France
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Immatriculation</strong>
              <br />
              RCS Albi 104 364 047
              <br />
              Numéro EUID : FR8101.104364047
              <br />
              Date d'immatriculation : 29 avril 2026
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Contact</strong>
              <br />
              <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">
                wm@wishmaker.fr
              </a>
            </p>
          </Section>

          <Section title="2. Direction de la publication">
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Président :</strong> Christophe SIMONIN
              <br />
              <strong className="font-semibold text-[#1A1A2E]">Directeur général :</strong> Bastien AVEROUS HUC
            </p>
            <p>
              Le directeur de la publication, au sens de l'article 93-2 de la loi du 29 juillet 1982, est le Président de la société, Christophe SIMONIN.
            </p>
          </Section>

          <Section title="3. Hébergement">
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Front-end (application web)</strong>
              <br />
              Vercel Inc.
              <br />
              340 S Lemon Ave #4133, Walnut, CA 91789, USA
              <br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] hover:underline">
                vercel.com
              </a>
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Back-end et base de données</strong>
              <br />
              Supabase Inc.
              <br />
              970 Toa Payoh North, Singapore 318992
              <br />
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] hover:underline">
                supabase.com
              </a>
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Nom de domaine</strong>
              <br />
              OVH SAS
              <br />
              2 rue Kellermann, 59100 Roubaix, France
            </p>
          </Section>

          <Section title="4. Activité">
            <p>
              Le présent site et l'application Wish Maker proposent un service de mise en relation entre utilisateurs pour la réalisation de vœux du quotidien.
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Activités déclarées au RCS :</strong> création et hébergement de sites internet, conception, programmation de logiciels, sites web et outils informatiques, ainsi que la gestion de projets y relatifs.
            </p>
          </Section>

          <Section title="5. Propriété intellectuelle">
            <p>
              L'ensemble du site (textes, images, vidéos, code source, design, charte graphique, logo) est la propriété exclusive de la société Wish Maker ou de ses partenaires. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.
            </p>
            <p>
              Les contenus publiés par les utilisateurs (vœux, photos, messages) restent leur propriété&nbsp;; ils accordent à Wish Maker une licence non-exclusive d'utilisation strictement nécessaire au fonctionnement du service.
            </p>
          </Section>

          <Section title="6. Données personnelles">
            <p>
              Wish Maker traite des données personnelles dans le cadre de son service, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi française Informatique et Libertés.
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Données collectées</strong>
              <br />
              Identité (prénom, nom, pseudo), email, ville, données de géolocalisation, photos, messages échangés, informations de paiement (traitées par notre partenaire Stripe).
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Vos droits</strong>
              <br />
              Accès, rectification, effacement, portabilité, opposition. Pour exercer vos droits, contactez-nous à{' '}
              <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">
                wm@wishmaker.fr
              </a>
              .
            </p>
            <p>
              Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] hover:underline">
                cnil.fr
              </a>
              ).
            </p>
          </Section>

          <Section title="7. Cookies">
            <p>
              Le site utilise uniquement des cookies techniques nécessaires au fonctionnement du service (authentification, préférences). Aucun cookie publicitaire ou de tracking tiers n'est utilisé sans consentement.
            </p>
          </Section>

          <Section title="8. Loi applicable et juridiction compétente">
            <p>
              Le présent site est soumis au droit français. Tout litige relatif à son utilisation relève de la compétence exclusive des tribunaux d'Albi (81), sous réserve des règles d'ordre public.
            </p>
          </Section>

        </div>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-[#EEEEF2] flex items-center justify-between text-[12px] text-[#8A8A9A]">
            <span>Wish Maker SAS</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/support')}
                className="hover:text-[#5B6BF5] transition-colors"
              >
                Support
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button
                onClick={() => navigate('/')}
                className="hover:text-[#5B6BF5] transition-colors"
              >
                ← Accueil
              </button>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[16px] font-bold tracking-[-0.01em] text-[#1A1A2E] mb-3">
        {title}
      </h2>
      <div className="text-[14px] sm:text-[14.5px] leading-[1.7] text-[#3A3A4E] flex flex-col gap-3">
        {children}
      </div>
    </section>
  )
}
