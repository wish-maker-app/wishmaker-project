import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

/**
 * Page Mentions légales — publique, accessible sans authentification.
 *
 * Obligatoire en droit français (LCEN 2004 art. 6 III) pour tout site
 * web professionnel. Informations sourcées de l'Extrait Kbis de la SAS
 * Wish Maker (RCS Albi 104 364 047, immatriculation 29/04/2026).
 *
 * Direction visuelle : architectural minimalism + aurora Wish Maker.
 * Sections numérotées avec un chiffre gradient prominent, sommaire TOC
 * cliquable en haut, typographie respirée pour la lecture longue.
 */

const SECTIONS = [
  { id: 'editeur',   num: '01', short: 'Éditeur',     title: 'Éditeur du site' },
  { id: 'direction', num: '02', short: 'Direction',   title: 'Direction de la publication' },
  { id: 'hosting',   num: '03', short: 'Hébergement', title: 'Hébergement' },
  { id: 'activite',  num: '04', short: 'Activité',    title: 'Activité' },
  { id: 'pi',        num: '05', short: 'PI',          title: 'Propriété intellectuelle' },
  { id: 'rgpd',      num: '06', short: 'Données',     title: 'Données personnelles' },
  { id: 'cookies',   num: '07', short: 'Cookies',     title: 'Cookies' },
  { id: 'loi',       num: '08', short: 'Loi',         title: 'Loi applicable & juridiction' },
]

function jumpTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function MentionsLegales() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen w-full bg-white text-[#1A1A2E] relative overflow-x-hidden antialiased">
      {/* Aurora */}
      <AuroraBackdrop />

      {/* Header sticky */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 border-b border-[#EEEEF2]/80">
        <div className="max-w-[680px] mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
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

      <main className="relative z-10 max-w-[680px] mx-auto px-5 sm:px-8 pb-24">

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pt-14 sm:pt-20 pb-10"
        >
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#EEEEF2] bg-white/80 backdrop-blur-sm mb-6">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="text-[11.5px] font-semibold tracking-wide text-[#3A3A4E]">
              Informations légales
            </span>
          </div>

          <h1 className="text-[44px] sm:text-[56px] font-bold tracking-[-0.035em] leading-[1.02] mb-5">
            <span className="text-[#1A1A2E]">Mentions</span>
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 60%,#F59E0B 110%)' }}
            >
              légales
            </span>
          </h1>

          <div className="flex items-center gap-3 flex-wrap text-[12.5px] text-[#8A8A9A]">
            <span className="font-semibold text-[#3A3A4E]">Dernière mise à jour</span>
            <span>·</span>
            <span>Mai 2026</span>
            <span>·</span>
            <span>Lecture : 3 min</span>
          </div>
        </motion.section>

        {/* Table des matières */}
        <motion.nav
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          aria-label="Sommaire"
          className="mb-14 rounded-3xl p-5 sm:p-6 border border-[#EEEEF2] bg-white/60 backdrop-blur-sm"
        >
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#8A8A9A] mb-4">
            Sommaire
          </p>
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => jumpTo(s.id)}
                  className="group w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-[#F7F8FC] transition-colors"
                >
                  <span
                    className="text-[10px] font-bold tracking-[0.06em] tabular-nums"
                    style={{
                      backgroundImage: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {s.num}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#1A1A2E] truncate group-hover:text-[#5B6BF5] transition-colors">
                    {s.short}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </motion.nav>

        {/* ─── Sections ─── */}
        <div className="flex flex-col gap-14 sm:gap-16">

          <LegalSection id="editeur" num="01" title="Éditeur du site">
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Wish Maker</strong> —
              Société par actions simplifiée (SAS) au capital social de <strong className="font-semibold text-[#1A1A2E]">1 000,00 €</strong>.
            </p>

            <KeyValueGrid items={[
              { k: 'Siège social',           v: <>770 Chemin de la Nebrale<br />81150 Labastide-de-Lévis, France</> },
              { k: 'Immatriculation',        v: 'RCS Albi 104 364 047' },
              { k: 'Numéro EUID',            v: <span className="font-mono text-[12.5px]">FR8101.104364047</span> },
              { k: 'Date d\'immatriculation', v: '29 avril 2026' },
              { k: 'Contact',                v: <a href="mailto:contact@wishmaker.fr" className="text-[#5B6BF5] font-semibold hover:text-[#9B59F5] transition-colors">contact@wishmaker.fr</a> },
            ]} />
          </LegalSection>

          <LegalSection id="direction" num="02" title="Direction de la publication">
            <KeyValueGrid items={[
              { k: 'Président',         v: 'Christophe SIMONIN' },
              { k: 'Directeur général', v: 'Bastien AVEROUS HUC' },
            ]} />
            <p className="mt-4">
              Le directeur de la publication, au sens de l'article 93-2 de la loi du 29 juillet 1982, est le Président de la société, <strong className="font-semibold text-[#1A1A2E]">Christophe SIMONIN</strong>.
            </p>
          </LegalSection>

          <LegalSection id="hosting" num="03" title="Hébergement">
            <p className="mb-5 text-[#8A8A9A]">
              Le service repose sur trois fournisseurs d'infrastructure :
            </p>
            <div className="flex flex-col gap-3">
              <HostCard
                label="Front-end · application web"
                name="Vercel Inc."
                addr="340 S Lemon Ave #4133, Walnut, CA 91789, USA"
                url="https://vercel.com"
              />
              <HostCard
                label="Back-end · base de données"
                name="Supabase Inc."
                addr="970 Toa Payoh North, Singapore 318992"
                url="https://supabase.com"
              />
              <HostCard
                label="Nom de domaine"
                name="OVH SAS"
                addr="2 rue Kellermann, 59100 Roubaix, France"
                url="https://ovh.com"
              />
            </div>
          </LegalSection>

          <LegalSection id="activite" num="04" title="Activité">
            <p>
              Le présent site et l'application Wish Maker proposent un service de mise en relation entre utilisateurs pour la réalisation de vœux du quotidien.
            </p>
            <p>
              <strong className="font-semibold text-[#1A1A2E]">Activités déclarées au RCS :</strong> création et hébergement de sites internet, conception, programmation de logiciels, sites web et outils informatiques, ainsi que la gestion de projets y relatifs.
            </p>
          </LegalSection>

          <LegalSection id="pi" num="05" title="Propriété intellectuelle">
            <p>
              L'ensemble du site — textes, images, vidéos, code source, design, charte graphique, logo — est la propriété exclusive de la société Wish Maker ou de ses partenaires. Toute reproduction, même partielle, est interdite sans autorisation écrite préalable.
            </p>
            <p>
              Les contenus publiés par les utilisateurs (vœux, photos, messages) restent leur propriété&nbsp;; ils accordent à Wish Maker une licence non-exclusive d'utilisation strictement nécessaire au fonctionnement du service.
            </p>
          </LegalSection>

          <LegalSection id="rgpd" num="06" title="Données personnelles" accent="#9B59F5">
            <p>
              Wish Maker traite des données personnelles dans le cadre de son service, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi française Informatique et Libertés.
            </p>

            <div className="rounded-2xl border border-[#EEEEF2] bg-[#F7F8FC] p-5 my-4">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#8A8A9A] mb-3">
                Données collectées
              </p>
              <ul className="flex flex-col gap-2 text-[13.5px]">
                {[
                  'Identité — prénom, nom, pseudo',
                  'Email et préférences de compte',
                  'Ville et données de géolocalisation',
                  'Photos et messages échangés',
                  'Informations de paiement (traitées par Stripe)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[#3A3A4E]">
                    <span
                      className="mt-2 w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p>
              <strong className="font-semibold text-[#1A1A2E]">Vos droits</strong> : accès, rectification, effacement, portabilité, opposition. Pour les exercer, écrivez-nous à{' '}
              <a href="mailto:contact@wishmaker.fr" className="text-[#5B6BF5] font-semibold hover:text-[#9B59F5] transition-colors">
                contact@wishmaker.fr
              </a>
              .
            </p>
            <p className="text-[13px] text-[#8A8A9A]">
              Vous pouvez également introduire une réclamation auprès de la CNIL —{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] underline hover:text-[#9B59F5] transition-colors">
                cnil.fr
              </a>
              .
            </p>
          </LegalSection>

          <LegalSection id="cookies" num="07" title="Cookies">
            <p>
              Le site utilise uniquement des cookies techniques nécessaires au fonctionnement du service — authentification, préférences de langue, état de la session. Aucun cookie publicitaire ni de tracking tiers n'est utilisé sans votre consentement explicite.
            </p>
          </LegalSection>

          <LegalSection id="loi" num="08" title="Loi applicable & juridiction" accent="#F59E0B">
            <p>
              Le présent site est soumis au droit français. Tout litige relatif à son utilisation relève de la compétence exclusive des tribunaux d'Albi (81), sous réserve des règles d'ordre public.
            </p>
          </LegalSection>
        </div>

        {/* Footer */}
        <PageFooter />
      </main>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────

function LegalSection({ id, num, title, accent = '#5B6BF5', children }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-24"
    >
      <div className="flex items-baseline gap-4 mb-5">
        <span
          className="text-[44px] sm:text-[56px] font-bold tracking-[-0.04em] tabular-nums leading-none select-none"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}, #9B59F5)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {num}
        </span>
        <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] leading-tight pb-1">
          {title}
        </h2>
      </div>
      {/* Liseré décoratif */}
      <div
        className="h-px w-16 mb-5"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div className="text-[14.5px] sm:text-[15px] leading-[1.7] text-[#3A3A4E] flex flex-col gap-3">
        {children}
      </div>
    </motion.section>
  )
}

function KeyValueGrid({ items }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-6 gap-y-3 sm:gap-y-2.5 text-[14px]">
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="text-[12px] font-semibold tracking-wide uppercase text-[#8A8A9A] sm:pt-0.5">
            {item.k}
          </dt>
          <dd className="text-[#1A1A2E] sm:text-[14.5px]">{item.v}</dd>
        </div>
      ))}
    </dl>
  )
}

function HostCard({ label, name, addr, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 p-4 rounded-2xl border border-[#EEEEF2] bg-white hover:border-[#D4DAFF] hover:shadow-[0_4px_18px_rgba(91,107,245,0.08)] transition-all"
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M3 5v6c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
          <path d="M3 11v6c0 1.66 4.03 3 9 3s9-1.34 9-3v-6" />
        </svg>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-bold tracking-[0.14em] uppercase text-[#8A8A9A]">
          {label}
        </span>
        <span className="block text-[14px] font-semibold text-[#1A1A2E] mt-0.5">
          {name}
        </span>
        <span className="block text-[12px] text-[#8A8A9A] mt-0.5">
          {addr}
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
        className="flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:stroke-[#5B6BF5]"
      >
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  )
}

function AuroraBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden="true">
      <div
        className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full blur-[120px] opacity-[0.28]"
        style={{ background: 'radial-gradient(circle, #9B59F5 0%, #5B6BF5 50%, transparent 75%)' }}
      />
      <div
        className="absolute top-[60%] -left-40 w-[420px] h-[420px] rounded-full blur-[120px] opacity-[0.15]"
        style={{ background: 'radial-gradient(circle, #F59E0B 0%, #F5C542 40%, transparent 75%)' }}
      />
    </div>
  )
}

function PageFooter() {
  const navigate = useNavigate()
  return (
    <footer className="pt-12 mt-12 border-t border-[#EEEEF2]">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          />
          <span className="text-[12.5px] font-bold tracking-[-0.005em] text-[#1A1A2E]">Wish Maker</span>
          <span className="text-[11px] text-[#B0B0BE]">·</span>
          <span className="text-[11px] text-[#8A8A9A]">Wish Maker SAS</span>
        </div>
        <div className="flex items-center gap-3 text-[12.5px]">
          <button
            onClick={() => navigate('/support')}
            className="font-medium text-[#8A8A9A] hover:text-[#5B6BF5] transition-colors"
          >
            Support
          </button>
          <span className="text-[#D0D0D8]">·</span>
          <button
            onClick={() => navigate('/')}
            className="font-medium text-[#8A8A9A] hover:text-[#5B6BF5] transition-colors"
          >
            ← Accueil
          </button>
        </div>
      </div>
    </footer>
  )
}
