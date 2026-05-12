import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Page Mentions légales — publique, accessible sans authentification.
 *
 * Obligatoire en droit français (LCEN 2004 art. 6 III) pour tout site
 * web professionnel. Informations sourcées de l'Extrait Kbis de la SAS
 * Wish Maker (RCS Albi 104 364 047, immatriculation 29/04/2026).
 */
export default function MentionsLegales() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex items-start justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-[520px] flex flex-col gap-6"
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

        <h1 className="text-2xl font-bold text-[#1A1A2E] tracking-[-0.02em] pt-2">
          Mentions légales
        </h1>
        <p className="text-[12px] text-[#8A8A9A] -mt-3">
          Dernière mise à jour : mai 2026
        </p>

        {/* Section 1 — Éditeur */}
        <Section title="1. Éditeur du site">
          <p>
            <strong>Wish Maker</strong>
            <br />
            Société par actions simplifiée (SAS) au capital de 1 000,00 €
          </p>
          <p>
            <strong>Siège social :</strong>
            <br />
            770 Chemin de la Nebrale
            <br />
            81150 Labastide-de-Lévis, France
          </p>
          <p>
            <strong>Immatriculation :</strong> RCS Albi 104 364 047
            <br />
            <strong>Numéro EUID :</strong> FR8101.104364047
            <br />
            <strong>Date d'immatriculation :</strong> 29 avril 2026
          </p>
          <p>
            <strong>Contact :</strong>{' '}
            <a href="mailto:contact@wishmaker.fr" className="text-[#5B6BF5] underline">
              contact@wishmaker.fr
            </a>
          </p>
        </Section>

        {/* Section 2 — Direction */}
        <Section title="2. Direction de la publication">
          <p>
            <strong>Président :</strong> Christophe SIMONIN
            <br />
            <strong>Directeur général :</strong> Bastien AVEROUS HUC
          </p>
          <p>
            Le directeur de la publication, au sens de l'article 93-2 de la
            loi du 29 juillet 1982, est le Président de la société, Christophe
            SIMONIN.
          </p>
        </Section>

        {/* Section 3 — Hébergement */}
        <Section title="3. Hébergement">
          <p>
            <strong>Hébergement du site web (front-end) :</strong>
            <br />
            Vercel Inc.
            <br />
            340 S Lemon Ave #4133, Walnut, CA 91789, USA
            <br />
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] underline">
              vercel.com
            </a>
          </p>
          <p>
            <strong>Hébergement de la base de données et back-end :</strong>
            <br />
            Supabase Inc.
            <br />
            970 Toa Payoh North, Singapore 318992
            <br />
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] underline">
              supabase.com
            </a>
          </p>
          <p>
            <strong>Nom de domaine :</strong>
            <br />
            OVH SAS
            <br />
            2 rue Kellermann, 59100 Roubaix, France
          </p>
        </Section>

        {/* Section 4 — Activité */}
        <Section title="4. Activité">
          <p>
            Le présent site et l'application Wish Maker proposent un service
            de mise en relation entre utilisateurs pour la réalisation de
            vœux du quotidien.
          </p>
          <p>
            <strong>Activités déclarées :</strong> création et hébergement de
            sites internet, conception, programmation de logiciels, sites
            web et outils informatiques, ainsi que la gestion de projets y
            relatifs.
          </p>
        </Section>

        {/* Section 5 — Propriété intellectuelle */}
        <Section title="5. Propriété intellectuelle">
          <p>
            L'ensemble du site (textes, images, vidéos, code source, design,
            charte graphique, logo) est la propriété exclusive de la société
            Wish Maker ou de ses partenaires. Toute reproduction, même
            partielle, est interdite sans autorisation écrite préalable.
          </p>
          <p>
            Les contenus publiés par les utilisateurs (vœux, photos, messages)
            restent leur propriété ; ils accordent à Wish Maker une licence
            non-exclusive d'utilisation strictement nécessaire au fonctionnement
            du service.
          </p>
        </Section>

        {/* Section 6 — Données personnelles */}
        <Section title="6. Données personnelles">
          <p>
            Wish Maker traite des données personnelles dans le cadre de son
            service, conformément au Règlement Général sur la Protection des
            Données (RGPD) et à la loi française Informatique et Libertés.
          </p>
          <p>
            <strong>Données collectées :</strong> identité (prénom, nom,
            pseudo), email, ville, données de géolocalisation, photos,
            messages échangés, informations de paiement (traitées par notre
            partenaire Stripe).
          </p>
          <p>
            <strong>Vos droits :</strong> accès, rectification, effacement,
            portabilité, opposition. Pour exercer vos droits, contactez-nous
            à{' '}
            <a href="mailto:contact@wishmaker.fr" className="text-[#5B6BF5] underline">
              contact@wishmaker.fr
            </a>
            .
          </p>
          <p>
            Vous disposez également du droit d'introduire une réclamation
            auprès de la CNIL (
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] underline">
              cnil.fr
            </a>
            ).
          </p>
        </Section>

        {/* Section 7 — Cookies */}
        <Section title="7. Cookies">
          <p>
            Le site utilise uniquement des cookies techniques nécessaires au
            fonctionnement du service (authentification, préférences). Aucun
            cookie publicitaire ou de tracking tiers n'est utilisé sans
            consentement.
          </p>
        </Section>

        {/* Section 8 — Loi applicable */}
        <Section title="8. Loi applicable et juridiction compétente">
          <p>
            Le présent site est soumis au droit français. Tout litige relatif
            à son utilisation relève de la compétence exclusive des tribunaux
            d'Albi (81), sous réserve des règles d'ordre public.
          </p>
        </Section>

        {/* CTA */}
        <div className="flex justify-center pt-4 pb-4">
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

// Petit composant interne pour ne pas répéter le styling des sections
function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">{title}</h2>
      <div className="text-[14px] text-[#3A3A4E] leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </section>
  )
}
