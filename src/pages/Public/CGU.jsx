import { useNavigate } from 'react-router-dom'

/**
 * Conditions Generales d'Utilisation (CGU) — publiques, accessibles sans
 * authentification.
 *
 * Template solide adapte a Wish Maker (plateforme de mise en relation
 * locale, pas de transaction de service). A faire VALIDER PAR UN AVOCAT
 * avant production. Version 1.0.
 */
export default function CGU() {
  const navigate = useNavigate()

  return (
    <div
      className="public-fixed-page fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >
      {/* Header */}
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
        <div className="max-w-[680px] mx-auto px-5 sm:px-6 py-10 sm:py-14">

          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight">
            Conditions Générales d'Utilisation
          </h1>
          <p className="mt-2 text-[13px] text-[#8A8A9A]">
            Version 1.0 — En vigueur au 1ᵉʳ mai 2026
          </p>

          <div className="mt-10 flex flex-col gap-10">

            <Section title="1. Préambule">
              <p>
                Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'utilisation de la plateforme Wish Maker, éditée par la société Wish Maker SAS, accessible via le site internet <a href="https://wishmaker.fr" className="text-[#5B6BF5] hover:underline">wishmaker.fr</a> et son application web progressive (PWA) (ci-après « la Plateforme »).
              </p>
              <p>
                Toute utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. Si vous n'acceptez pas ces conditions, vous devez vous abstenir d'utiliser la Plateforme.
              </p>
            </Section>

            <Section title="2. Définitions">
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Plateforme</strong> : le site et l'application Wish Maker permettant la mise en relation entre utilisateurs.
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Wisher</strong> : utilisateur publiant un vœu (une demande de service ou de coup de main).
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Maker</strong> : utilisateur répondant aux vœux des Wishers pour leur apporter son aide.
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Vœu</strong> : annonce publiée par un Wisher décrivant un besoin localisé.
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Utilisateur</strong> : toute personne physique majeure inscrite sur la Plateforme, agissant à titre personnel ou professionnel.
              </p>
            </Section>

            <Section title="3. Inscription et compte utilisateur">
              <p>
                L'inscription sur la Plateforme est gratuite. Elle nécessite une adresse email valide, un mot de passe et la communication de données d'identification (prénom, nom, pseudo, ville).
              </p>
              <p>
                L'Utilisateur s'engage à fournir des informations exactes, complètes et à jour, et à les mettre à jour le cas échéant. Il garantit que les informations fournies ne portent atteinte à aucun droit de tiers.
              </p>
              <p>
                L'inscription est réservée aux personnes physiques majeures (18 ans révolus). Wish Maker SAS se réserve le droit de demander un justificatif d'identité.
              </p>
            </Section>

            <Section title="4. Description du service">
              <p>
                Wish Maker est un service de <strong className="font-semibold text-[#1A1A2E]">mise en relation</strong> entre Wishers et Makers. La Plateforme permet de publier des vœux géolocalisés et d'échanger via messagerie pour organiser la réalisation de ces vœux.
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Wish Maker n'est pas partie aux échanges et transactions de services</strong> entre les utilisateurs. Les modalités de réalisation, de paiement et de garantie des services sont déterminées directement entre le Wisher et le Maker, en dehors de la Plateforme.
              </p>
              <p>
                Certains services premium proposés par la Plateforme (achat de packs de vœux supplémentaires, options « Urgent » et « Prolongation ») font l'objet de Conditions Générales de Vente (CGV) distinctes.
              </p>
            </Section>

            <Section title="5. Engagements de l'utilisateur">
              <p>
                L'Utilisateur s'engage à utiliser la Plateforme de bonne foi et conformément à sa destination. Il s'interdit notamment :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>De publier des contenus illicites, injurieux, diffamatoires, racistes, sexistes, homophobes, violents, à caractère sexuel ou portant atteinte à la vie privée de tiers</li>
                <li>De publier des vœux contraires à la loi (vente d'alcool aux mineurs, stupéfiants, contrefaçon, etc.)</li>
                <li>D'usurper l'identité d'un tiers</li>
                <li>De contourner les mécanismes de modération ou de paiement de la Plateforme</li>
                <li>De spammer, de scraper ou d'exploiter automatiquement les données de la Plateforme</li>
                <li>De tenter de nuire au fonctionnement technique de la Plateforme</li>
              </ul>
            </Section>

            <Section title="6. Modération et signalement">
              <p>
                Wish Maker met en œuvre des mécanismes de modération automatique (analyse des contenus textuels et photos avant publication) et de modération a posteriori sur signalement.
              </p>
              <p>
                Tout Utilisateur peut signaler un contenu, un comportement ou un compte qu'il juge contraire aux présentes CGU via le bouton de signalement intégré ou par email à{' '}
                <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">wm@wishmaker.fr</a>.
              </p>
              <p>
                Wish Maker SAS se réserve le droit de supprimer tout contenu ou compte ne respectant pas les CGU, sans préavis ni indemnité.
              </p>
            </Section>

            <Section title="7. Limitation de responsabilité">
              <p>
                La Plateforme étant un service de mise en relation, Wish Maker SAS n'est pas responsable :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Du contenu des vœux ou messages publiés par les Utilisateurs</li>
                <li>De la qualité, de la sécurité ou de la légalité des prestations échangées entre Wisher et Maker</li>
                <li>Des paiements effectués en dehors de la Plateforme entre Utilisateurs</li>
                <li>Des litiges entre Utilisateurs liés à la réalisation d'un vœu</li>
                <li>Des interruptions temporaires du service pour maintenance ou cause technique</li>
              </ul>
              <p>
                Wish Maker SAS met néanmoins tout en œuvre pour assurer la disponibilité et la sécurité du service.
              </p>
            </Section>

            <Section title="8. Suspension et résiliation du compte">
              <p>
                L'Utilisateur peut supprimer son compte à tout moment depuis son profil. Cette suppression entraîne l'anonymisation ou la suppression de ses données, sous réserve des obligations légales de conservation.
              </p>
              <p>
                Wish Maker SAS peut suspendre ou résilier un compte de plein droit, sans préavis, en cas de manquement grave ou répété aux présentes CGU.
              </p>
            </Section>

            <Section title="9. Propriété intellectuelle">
              <p>
                La Plateforme (design, code, marque, logo, contenu éditorial) est la propriété exclusive de Wish Maker SAS. Toute reproduction, représentation ou exploitation non autorisée est interdite.
              </p>
              <p>
                Les contenus publiés par les Utilisateurs (textes, photos) restent leur propriété. En les publiant, ils accordent à Wish Maker SAS une licence non-exclusive d'utilisation, strictement limitée au fonctionnement du service.
              </p>
            </Section>

            <Section title="10. Modification des CGU">
              <p>
                Wish Maker SAS se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs sont informés des modifications par email ou notification dans l'application. La poursuite de l'utilisation après modification vaut acceptation des nouvelles CGU.
              </p>
            </Section>

            <Section title="11. Loi applicable et juridiction compétente">
              <p>
                Les présentes CGU sont soumises au droit français. Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive des tribunaux d'Albi (81), sous réserve des règles d'ordre public applicables aux consommateurs.
              </p>
            </Section>

          </div>

          {/* Footer */}
          <footer className="mt-16 pt-6 border-t border-[#EEEEF2] flex items-center justify-between text-[12px] text-[#8A8A9A] flex-wrap gap-3">
            <span>Wish Maker SAS</span>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => navigate('/support')} className="hover:text-[#5B6BF5] transition-colors">Support</button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/mentions-legales')} className="hover:text-[#5B6BF5] transition-colors">Mentions légales</button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/cgv')} className="hover:text-[#5B6BF5] transition-colors">CGV</button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/privacy')} className="hover:text-[#5B6BF5] transition-colors">Confidentialité</button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/')} className="hover:text-[#5B6BF5] transition-colors">← Accueil</button>
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
