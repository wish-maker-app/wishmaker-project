import { useNavigate } from 'react-router-dom'

/**
 * Politique de Confidentialite — publique, accessible sans authentification.
 *
 * Conforme RGPD (articles 13/14). Obligatoire pour la soumission sur les
 * stores (Apple App Store / Google Play). Doit etre accessible sans
 * compte a une URL publique : https://wishmaker.fr/privacy
 *
 * Template solide adapte a Wish Maker. A faire VALIDER PAR UN AVOCAT
 * avant production. Version 1.0.
 */
export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div
      className="fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
      style={{
        width: '100vw',
        maxWidth: '100vw',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
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
            Politique de Confidentialité
          </h1>
          <p className="mt-2 text-[13px] text-[#8A8A9A]">
            Version 1.0 — En vigueur au 1ᵉʳ mai 2026
          </p>

          <p className="mt-6 text-[14.5px] leading-[1.7] text-[#3A3A4E]">
            Wish Maker accorde une importance particulière à la protection de vos données personnelles. La présente politique a pour objectif de vous informer, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi française « Informatique et Libertés », des traitements que nous effectuons sur vos données personnelles.
          </p>

          <div className="mt-10 flex flex-col gap-10">

            <Section title="1. Responsable du traitement">
              <p>
                Le responsable du traitement de vos données personnelles est :
              </p>
              <p>
                <strong className="font-semibold text-[#1A1A2E]">Wish Maker SAS</strong>
                <br />
                770 Chemin de la Nebrale, 81150 Labastide-de-Lévis, France
                <br />
                RCS Albi 104 364 047
                <br />
                Contact : <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">wm@wishmaker.fr</a>
              </p>
            </Section>

            <Section title="2. Données collectées">
              <p>
                Nous collectons et traitons les catégories de données suivantes :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Identité</strong> : prénom, nom, pseudo, date de création de compte</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Contact</strong> : adresse email</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Localisation</strong> : ville, coordonnées géographiques approximatives renseignées par l'Utilisateur</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Photo de profil et photos de vœux</strong> : images téléchargées par l'Utilisateur</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Contenu publié</strong> : vœux, messages échangés, avis</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Données de paiement</strong> : traitées exclusivement par notre prestataire Stripe — nous ne stockons aucune donnée bancaire</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Données techniques</strong> : adresse IP, type de navigateur, logs de connexion</li>
              </ul>
            </Section>

            <Section title="3. Finalités du traitement">
              <p>
                Vos données sont utilisées pour les finalités suivantes :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Création et gestion de votre compte utilisateur</li>
                <li>Mise en relation entre Wishers et Makers</li>
                <li>Modération et lutte contre la fraude et les abus</li>
                <li>Gestion des paiements pour les services premium</li>
                <li>Communication relative au service (notifications, alertes, support)</li>
                <li>Statistiques anonymes d'utilisation et amélioration du service</li>
                <li>Respect de nos obligations légales et réglementaires</li>
              </ul>
            </Section>

            <Section title="4. Bases légales">
              <p>
                Les traitements reposent sur les bases légales suivantes :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Exécution du contrat</strong> : gestion de compte, mise en relation, paiements</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Intérêt légitime</strong> : sécurité du service, lutte contre la fraude, statistiques anonymes</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Consentement</strong> : envoi d'emails marketing (le cas échéant), notifications push</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Obligation légale</strong> : conservation des données de facturation</li>
              </ul>
            </Section>

            <Section title="5. Destinataires des données">
              <p>
                Vos données sont accessibles à :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Les équipes internes de Wish Maker SAS, dans la limite de leurs habilitations</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Supabase Inc.</strong> (hébergement back-end et base de données, Singapour)</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Vercel Inc.</strong> (hébergement front-end, États-Unis)</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Stripe Payments Europe Ltd.</strong> (traitement des paiements, Irlande)</li>
                <li><strong className="font-semibold text-[#1A1A2E]">OVH SAS</strong> (nom de domaine, France)</li>
                <li>Les autorités administratives ou judiciaires sur réquisition légale</li>
              </ul>
              <p>
                Nous ne vendons ni ne louons jamais vos données à des tiers.
              </p>
            </Section>

            <Section title="6. Durée de conservation">
              <p>
                Vos données sont conservées :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Pendant toute la durée de vie de votre compte</strong></li>
                <li><strong className="font-semibold text-[#1A1A2E]">3 ans après la suppression</strong> du compte pour les données nécessaires à nos obligations légales (preuve, comptabilité)</li>
                <li><strong className="font-semibold text-[#1A1A2E]">10 ans</strong> pour les factures et données comptables (article L123-22 du Code de commerce)</li>
                <li>Les logs techniques sont conservés pendant 12 mois maximum</li>
              </ul>
            </Section>

            <Section title="7. Transferts hors Union européenne">
              <p>
                Certains de nos sous-traitants techniques sont situés hors de l'Union européenne :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Supabase</strong> : serveurs à Singapour</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Vercel</strong> : serveurs aux États-Unis</li>
              </ul>
              <p>
                Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne, garantissant un niveau de protection équivalent à celui prévu par le RGPD.
              </p>
            </Section>

            <Section title="8. Vos droits">
              <p>
                Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants sur vos données :
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong className="font-semibold text-[#1A1A2E]">Droit d'accès</strong> : obtenir une copie de vos données</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit de rectification</strong> : corriger des données inexactes</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit à l'effacement</strong> (« droit à l'oubli ») : demander la suppression de vos données</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit d'opposition</strong> : vous opposer à un traitement</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit à la limitation</strong> du traitement</li>
                <li><strong className="font-semibold text-[#1A1A2E]">Droit de retirer votre consentement</strong> à tout moment</li>
              </ul>
            </Section>

            <Section title="9. Cookies">
              <p>
                La Plateforme utilise uniquement des cookies <strong className="font-semibold text-[#1A1A2E]">strictement nécessaires</strong> à son fonctionnement (authentification, préférences linguistiques, panier d'achat).
              </p>
              <p>
                Nous n'utilisons aucun cookie publicitaire ni de tracking tiers à des fins de profilage commercial. Aucun consentement préalable n'est requis pour les cookies techniques essentiels.
              </p>
            </Section>

            <Section title="10. Exercer vos droits / Réclamation">
              <p>
                Pour exercer l'un de vos droits, contactez-nous par email à <a href="mailto:wm@wishmaker.fr" className="text-[#5B6BF5] hover:underline">wm@wishmaker.fr</a>. Une réponse vous sera apportée dans un délai maximum d'un mois.
              </p>
              <p>
                Si vous estimez, après nous avoir contactés, que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la <strong className="font-semibold text-[#1A1A2E]">Commission Nationale de l'Informatique et des Libertés (CNIL)</strong> :
              </p>
              <p>
                CNIL — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07
                <br />
                <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] hover:underline">
                  www.cnil.fr
                </a>
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
              <button onClick={() => navigate('/cgv')} className="hover:text-[#5B6BF5] transition-colors">CGV</button>
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
