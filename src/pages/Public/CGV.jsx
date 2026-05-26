import { useNavigate } from 'react-router-dom'

/**
 * Conditions Generales de Vente (CGV) — publiques, accessibles sans
 * authentification.
 *
 * Concernent UNIQUEMENT les services payants de la plateforme :
 * packs de voeux (Starter / Essentiel / Pro), option Urgent,
 * option Extension. Le service principal de mise en relation
 * reste gratuit.
 *
 * Template solide, a faire VALIDER PAR UN AVOCAT avant production.
 * Version 1.0.
 */
export default function CGV() {
  const navigate = useNavigate()

  return (
    <div
      className="fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
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
            Conditions Générales de Vente
          </h1>
          <p className="mt-2 text-[13px] text-[#8A8A9A]">
            Version 1.0 — En vigueur au 1ᵉʳ mai 2026
          </p>

          <div className="mt-10 flex flex-col gap-10">

            <Section title="1. Préambule">
              <p>
                Les présentes Conditions Générales de Vente (ci-après « CGV ») régissent les achats effectués sur la plateforme Wish Maker, éditée par la société Wish Maker SAS (RCS Albi 104 364 047), accessible via le site <a href="https://wishmaker.fr" className="text-[#5B6BF5] hover:underline">wishmaker.fr</a>.
              </p>
              <p>
                Les présentes CGV s'appliquent <strong className="font-semibold text-[#1A1A2E]">uniquement aux services payants proposés par la Plateforme</strong> (packs de vœux, options « Urgent » et « Prolongation »). Le service principal de mise en relation entre Wishers et Makers reste gratuit et est régi par les CGU.
              </p>
              <p>
                Toute commande implique l'acceptation pleine et entière des présentes CGV.
              </p>
            </Section>

            <Section title="2. Produits proposés">
              <p>
                La Plateforme propose les services payants suivants :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Pack Starter</strong> — 2,99&nbsp;€ TTC : crédit de vœux supplémentaires</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Pack Essentiel</strong> — 5,99&nbsp;€ TTC : crédit de vœux supplémentaires</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Pack Pro</strong> — 9,99&nbsp;€ TTC : crédit de vœux supplémentaires</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Option « Urgent »</strong> — 0,99&nbsp;€ TTC : mise en avant prioritaire d'un vœu pendant sa durée de vie</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Option « Prolongation »</strong> — 0,99&nbsp;€ TTC : extension de la durée de vie d'un vœu</li>
              </ul>
              <p>
                Wish Maker SAS se réserve le droit de modifier la composition de son catalogue à tout moment, sans que cela puisse affecter les commandes en cours.
              </p>
            </Section>

            <Section title="3. Prix">
              <p>
                Les prix sont indiqués en euros (€) toutes taxes comprises (TTC), TVA française applicable au taux en vigueur incluse le cas échéant.
              </p>
              <p>
                Wish Maker SAS se réserve le droit de modifier ses prix à tout moment. Les services seront facturés sur la base des tarifs en vigueur au moment de la validation de la commande.
              </p>
            </Section>

            <Section title="4. Modalités de paiement">
              <p>
                Les paiements sont effectués en ligne par carte bancaire via notre prestataire de paiement <strong className="font-semibold text-[#1A1A2E]">Stripe Payments Europe Ltd.</strong>, conforme aux normes PCI-DSS.
              </p>
              <p>
                Wish Maker SAS ne stocke aucune donnée bancaire. Les informations de paiement sont traitées directement par Stripe selon ses propres conditions et politique de confidentialité.
              </p>
              <p>
                Le débit intervient immédiatement à la validation de la commande. Une facture électronique récapitulative est disponible sur demande à l'adresse <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">wm@wishmaker.fr</a>.
              </p>
            </Section>

            <Section title="5. Livraison">
              <p>
                Les services proposés étant des <strong className="font-semibold text-[#1A1A2E]">contenus numériques</strong> non fournis sur un support matériel, ils sont délivrés instantanément après validation du paiement :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Les crédits de vœux sont ajoutés immédiatement au compte de l'Utilisateur</li>
                <li>Les options « Urgent » et « Prolongation » prennent effet immédiatement sur le vœu concerné</li>
              </ul>
            </Section>

            <Section title="6. Droit de rétractation">
              <p>
                Conformément à l'<strong className="font-semibold text-[#1A1A2E]">article L221-28 13° du Code de la consommation</strong>, l'Utilisateur reconnaît expressément que la fourniture d'un contenu numérique non fourni sur un support matériel et débutant immédiatement après son achat (crédits de vœux ajoutés au compte, options activées sur un vœu) entraîne la <strong className="font-semibold text-[#1A1A2E]">renonciation à son droit de rétractation</strong> de 14 jours.
              </p>
              <p>
                En validant sa commande, l'Utilisateur accepte expressément cette renonciation et reconnaît avoir été informé de la perte de son droit de rétractation.
              </p>
            </Section>

            <Section title="7. Réclamation et service après-vente">
              <p>
                Toute réclamation relative à une commande peut être adressée par email à <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">wm@wishmaker.fr</a>.
              </p>
              <p>
                Le délai de réponse est de 48 heures ouvrées. En cas de dysfonctionnement avéré (crédits non livrés, option non activée), Wish Maker SAS s'engage à effectuer la livraison du service ou à procéder au remboursement intégral de la transaction.
              </p>
            </Section>

            <Section title="8. Médiation de la consommation">
              <p>
                Conformément aux articles L611-1 et suivants du Code de la consommation, en cas de litige non résolu à l'amiable, l'Utilisateur consommateur peut recourir gratuitement à un médiateur de la consommation en vue d'une résolution amiable.
              </p>
              <p>
                L'Utilisateur peut également utiliser la plateforme européenne de règlement en ligne des litiges :{' '}
                <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] hover:underline">
                  ec.europa.eu/consumers/odr
                </a>.
              </p>
            </Section>

            <Section title="9. Loi applicable et juridiction compétente">
              <p>
                Les présentes CGV sont soumises au droit français. Tout litige relatif à leur interprétation ou exécution relève de la compétence exclusive des tribunaux d'Albi (81), sous réserve des règles d'ordre public applicables aux consommateurs.
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
              <button onClick={() => navigate('/cgu')} className="hover:text-[#5B6BF5] transition-colors">CGU</button>
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
