import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import lampeSvg from '../../assets/lampe.svg'
import genieSvg from '../../assets/genie.svg'

/**
 * Landing publique — homepage de wishmaker.fr.
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

  return (
    // fixed inset-0 : on s'echappe du shell mobile 430px applique par #root
    // (cf index.css). La landing prend toute la largeur du viewport et est
    // responsive comme une vraie homepage. Position fixed sur Apple iOS = OK
    // car le composant unmount immediatement quand l'URL change (navigate
    // depuis les boutons Se connecter / S'inscrire).
    <div
      className="fixed inset-0 z-[1000] bg-white text-[#1A1A2E] antialiased flex flex-col overflow-hidden"
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

            <p className="text-[15.5px] sm:text-[17px] leading-[1.6] text-[#3A3A4E] max-w-[560px] mx-auto mb-8">
              Wish Maker connecte celles et ceux qui ont un besoin avec les Makers — vos voisins,
              vos talents locaux — qui peuvent l'exaucer. Mécanique, jardinage, déménagement,
              cours, soins… un vœu publié, une réponse autour de vous.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/auth')}
                className="w-full sm:w-auto h-12 px-7 rounded-full text-white font-semibold text-[14.5px] transition-transform active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', boxShadow: '0 8px 24px rgba(91,107,245,0.3)' }}
              >
                Créer un compte gratuitement
              </button>
              <button
                onClick={() => navigate('/auth/login')}
                className="w-full sm:w-auto h-12 px-7 rounded-full text-[#1A1A2E] font-semibold text-[14.5px] border border-[#E0E0E0] hover:border-[#5B6BF5] hover:text-[#5B6BF5] transition-colors"
              >
                Se connecter
              </button>
            </div>

            <p className="mt-6 text-[12px] text-[#8A8A9A]">
              3 vœux gratuits chaque mois · Aucune carte requise à l'inscription
            </p>
          </motion.div>
        </Section>

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
                Décrivez ce dont vous avez besoin en 2 minutes : titre, mots-clés, lieu, et une récompense (argent ou bon procédé).
              </Step>
              <Step n="2" title="Les Makers répondent">
                Les Makers autour de vous voient votre vœu et vous écrivent. Vous choisissez celui qui vous convient.
              </Step>
              <Step n="3" title="Validez la réalisation">
                Une fois le vœu réalisé, vous validez et le paiement est libéré. Sécurisé par Stripe.
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
                  <p className="text-[15px] font-bold tracking-[-0.01em] text-[#1A1A2E]">J'aide mes voisins</p>
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
            title="Pour à peu près tout"
            subtitle="Du dépannage le plus urgent au cours particulier, les Makers couvrent un large éventail."
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-[960px] mx-auto">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.label}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-[#EEEEF2] bg-white hover:border-[#D4DAFF] hover:shadow-[0_4px_18px_rgba(91,107,245,0.08)] transition-all"
              >
                <span className="text-xl">{cat.emoji}</span>
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
            subtitle="3 vœux offerts chaque mois. Si vous en voulez plus, choisissez un pack — payé une fois, valable jusqu'à utilisation."
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
            Le Maker reçoit l'intégralité de la récompense fixée par le Wisher, moins 15% de commission plateforme.
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
                société à mission locale basée dans le Tarn (81). Notre objectif : remettre du lien entre voisins
                en facilitant les coups de main du quotidien, là où les plateformes nationales sont trop éloignées
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
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/support')} className="hover:text-[#5B6BF5] transition-colors">
                Support
              </button>
              <span className="text-[#D0D0D8]">·</span>
              <button onClick={() => navigate('/mentions-legales')} className="hover:text-[#5B6BF5] transition-colors">
                Mentions légales
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

// ──────────────────────────────────────────────
// Data
// ──────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🔧', label: 'Mécanique' },
  { emoji: '🌿', label: 'Jardinage' },
  { emoji: '🧹', label: 'Ménage' },
  { emoji: '📦', label: 'Déménagement' },
  { emoji: '🚚', label: 'Livraison' },
  { emoji: '🛠️', label: 'Bricolage' },
  { emoji: '👶', label: "Garde d'enfants" },
  { emoji: '🐕', label: "Garde d'animaux" },
  { emoji: '📚', label: 'Cours particuliers' },
  { emoji: '💆', label: 'Bien-être' },
  { emoji: '👨‍🍳', label: 'Cuisine' },
  { emoji: '🎉', label: 'Animation' },
]

const FEATURES = [
  {
    title: 'Hyperlocal',
    text: 'Les Makers sont littéralement dans votre quartier — pas à 30 km. Carte interactive, distance précise, calcul d\'itinéraire.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Paiement sécurisé',
    text: 'Stripe gère l\'argent en pré-autorisation : le Maker n\'est payé qu\'après confirmation du Wisher. Pas de litiges sur le paiement.',
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
