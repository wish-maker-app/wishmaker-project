import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'
import RootLayout from '../components/layout/RootLayout'

// Pages — chargement lazy pour les performances
import { lazy, Suspense } from 'react'

const RouteResolver = lazy(() => import('../pages/RouteResolver'))

// Pages publiques (accessibles a tous, sans wrapper auth) — requises pour
// le compte Apple Developer Organization (URL d'assistance + identification
// publique de l'editeur) et pour la conformite LCEN cote francais.
const Support = lazy(() => import('../pages/Public/Support'))
const MentionsLegales = lazy(() => import('../pages/Public/MentionsLegales'))
const CGU = lazy(() => import('../pages/Public/CGU'))
const CGV = lazy(() => import('../pages/Public/CGV'))
const Privacy = lazy(() => import('../pages/Public/Privacy'))

// Onboarding
const OnboardingStep1 = lazy(() => import('../pages/Onboarding/Step1'))
const OnboardingStep2 = lazy(() => import('../pages/Onboarding/Step2'))
const OnboardingStep3 = lazy(() => import('../pages/Onboarding/Step3'))

// Auth
const Landing      = lazy(() => import('../pages/Auth/Landing'))
const Login        = lazy(() => import('../pages/Auth/Login'))
const Register     = lazy(() => import('../pages/Auth/Register'))
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'))
const NewPassword  = lazy(() => import('../pages/Auth/NewPassword'))

// Setup
const SetupProfil       = lazy(() => import('../pages/Setup/Profil'))
const SetupPseudo       = lazy(() => import('../pages/Setup/Pseudo'))
const ChooseLocation    = lazy(() => import('../pages/Setup/ChooseLocation'))
const ChooseLocationMap = lazy(() => import('../pages/Setup/ChooseLocationMap'))

// Wisher
const WisherHome    = lazy(() => import('../pages/Wisher/Home'))
// CategoryChoice supprime en faveur du nouveau flow mots-cles a la Leboncoin
// (l'user va direct sur Step1 et choisit ses mots-cles a Step4 ; la categorie
// est derivee automatiquement du premier mot-cle pour l'usage visuel interne).
const CreateStep1   = lazy(() => import('../pages/Wisher/CreateWish/Step1'))
const CreateStep2   = lazy(() => import('../pages/Wisher/CreateWish/Step2'))
const CreateStep3   = lazy(() => import('../pages/Wisher/CreateWish/Step3'))
const CreateStep4   = lazy(() => import('../pages/Wisher/CreateWish/Step4'))
const CreateRecap   = lazy(() => import('../pages/Wisher/CreateWish/Recap'))
const CreateSuccess = lazy(() => import('../pages/Wisher/CreateWish/Success'))
const EditWish = lazy(() => import('../pages/Wisher/CreateWish/EditWish'))

// Maker
const MakerHome   = lazy(() => import('../pages/Maker/Home'))
const MakerSearch = lazy(() => import('../pages/Maker/Search'))
const MakerFilters = lazy(() => import('../pages/Maker/Filters'))
const WishDetail  = lazy(() => import('../pages/Maker/WishDetail'))
const UserWishes  = lazy(() => import('../pages/Maker/UserWishes'))
const MakerSuccess = lazy(() => import('../pages/Maker/Success'))

// Messages
const Inbox = lazy(() => import('../pages/Messages/Inbox'))
const Chat  = lazy(() => import('../pages/Messages/Chat'))

// Profile
const Profile = lazy(() => import('../pages/Profile/index'))
const EditProfile = lazy(() => import('../pages/Profile/EditProfile'))
const Reviews = lazy(() => import('../pages/Profile/Reviews'))
const Favorites = lazy(() => import('../pages/Profile/Favorites'))
const ProTags = lazy(() => import('../pages/Profile/ProTags'))

// Admin
const Admin = lazy(() => import('../pages/Admin/index'))
const AdminStats = lazy(() => import('../pages/Admin/Stats'))

// Loader minimal pendant le lazy loading
function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
    </div>
  )
}

// ──────────────────────────────────────────────
// Guards
// ──────────────────────────────────────────────

// Helper: calcule la prochaine étape de setup à effectuer selon les champs renseignés
function nextSetupStep(profile) {
  if (!profile) return '/setup/profil'
  if (!profile.prenom || !profile.nom) return '/setup/profil'
  if (!profile.pseudo) return '/setup/pseudo'
  if (!profile.ville)  return '/setup/localisation'
  return null // tout est OK
}

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  if (!user) return <Navigate to="/auth" replace />
  // Onboarding pas terminé → redirige vers le 1er step manquant
  const missing = nextSetupStep(profile)
  if (missing && !profile?.onboarding_completed) return <Navigate to={missing} replace />
  return <Outlet />
}

function SetupRoute() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.onboarding_completed) return <Navigate to="/maker" replace />
  return <Outlet />
}

function PublicRoute() {
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  if (user && profile?.onboarding_completed) return <Navigate to="/maker" replace />
  // Session active mais setup pas fini → reprendre au bon step
  if (user && profile) {
    const missing = nextSetupStep(profile)
    if (missing) return <Navigate to={missing} replace />
  }
  return <Outlet />
}

// ──────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  {
    path: '/',
    element: <Suspense fallback={<PageLoader />}><RouteResolver /></Suspense>,
  },

  // Pages publiques (accessibles a tous, hors wrappers auth)
  { path: '/support',         element: <Suspense fallback={<PageLoader />}><Support /></Suspense> },
  { path: '/mentions-legales', element: <Suspense fallback={<PageLoader />}><MentionsLegales /></Suspense> },
  { path: '/cgu',             element: <Suspense fallback={<PageLoader />}><CGU /></Suspense> },
  { path: '/cgv',             element: <Suspense fallback={<PageLoader />}><CGV /></Suspense> },
  { path: '/privacy',         element: <Suspense fallback={<PageLoader />}><Privacy /></Suspense> },

  // Onboarding (public)
  {
    element: <PublicRoute />,
    children: [
      { path: '/onboarding/1', element: <Suspense fallback={<PageLoader />}><OnboardingStep1 /></Suspense> },
      { path: '/onboarding/2', element: <Suspense fallback={<PageLoader />}><OnboardingStep2 /></Suspense> },
      { path: '/onboarding/3', element: <Suspense fallback={<PageLoader />}><OnboardingStep3 /></Suspense> },
    ],
  },

  // Auth (public)
  {
    path: '/auth',
    element: <PublicRoute />,
    children: [
      { index: true,              element: <Suspense fallback={<PageLoader />}><Landing /></Suspense> },
      { path: 'login',            element: <Suspense fallback={<PageLoader />}><Login /></Suspense> },
      { path: 'register',         element: <Suspense fallback={<PageLoader />}><Register /></Suspense> },
      { path: 'forgot-password',  element: <Suspense fallback={<PageLoader />}><ForgotPassword /></Suspense> },
      { path: 'new-password',     element: <Suspense fallback={<PageLoader />}><NewPassword /></Suspense> },
    ],
  },

  // Setup post-inscription
  {
    path: '/setup',
    element: <SetupRoute />,
    children: [
      { path: 'profil',            element: <Suspense fallback={<PageLoader />}><SetupProfil /></Suspense> },
      { path: 'pseudo',            element: <Suspense fallback={<PageLoader />}><SetupPseudo /></Suspense> },
      { path: 'localisation',      element: <Suspense fallback={<PageLoader />}><ChooseLocation /></Suspense> },
      { path: 'localisation-carte', element: <Suspense fallback={<PageLoader />}><ChooseLocationMap /></Suspense> },
    ],
  },

  // App protégée
  {
    element: <ProtectedRoute />,
    children: [
      // Wisher
      { path: '/wisher',               element: <Suspense fallback={<PageLoader />}><WisherHome /></Suspense> },
      // /wisher/create -> redirige direct vers Step1 (CategoryChoice supprime)
      { path: '/wisher/create',        element: <Navigate to="/wisher/create/1" replace /> },
      { path: '/wisher/create/1',      element: <Suspense fallback={<PageLoader />}><CreateStep1 /></Suspense> },
      { path: '/wisher/create/2',      element: <Suspense fallback={<PageLoader />}><CreateStep2 /></Suspense> },
      { path: '/wisher/create/3',      element: <Suspense fallback={<PageLoader />}><CreateStep3 /></Suspense> },
      { path: '/wisher/create/4',      element: <Suspense fallback={<PageLoader />}><CreateStep4 /></Suspense> },
      { path: '/wisher/create/recap',  element: <Suspense fallback={<PageLoader />}><CreateRecap /></Suspense> },
      { path: '/wisher/create/success', element: <Suspense fallback={<PageLoader />}><CreateSuccess /></Suspense> },
      { path: '/wisher/edit/:wishId', element: <Suspense fallback={<PageLoader />}><EditWish /></Suspense> },

      // Maker
      { path: '/maker',               element: <Suspense fallback={<PageLoader />}><MakerHome /></Suspense> },
      { path: '/maker/search',        element: <Suspense fallback={<PageLoader />}><MakerSearch /></Suspense> },
      { path: '/maker/filters',       element: <Suspense fallback={<PageLoader />}><MakerFilters /></Suspense> },
      { path: '/maker/wish/:id',      element: <Suspense fallback={<PageLoader />}><WishDetail /></Suspense> },
      { path: '/maker/user/:userId',  element: <Suspense fallback={<PageLoader />}><UserWishes /></Suspense> },
      { path: '/maker/success',       element: <Suspense fallback={<PageLoader />}><MakerSuccess /></Suspense> },

      // Messages
      { path: '/messages',            element: <Suspense fallback={<PageLoader />}><Inbox /></Suspense> },
      { path: '/messages/:id',        element: <Suspense fallback={<PageLoader />}><Chat /></Suspense> },

      // Profile
      { path: '/profile',             element: <Suspense fallback={<PageLoader />}><Profile /></Suspense> },
      { path: '/profile/edit',        element: <Suspense fallback={<PageLoader />}><EditProfile /></Suspense> },
      { path: '/profile/reviews',     element: <Suspense fallback={<PageLoader />}><Reviews /></Suspense> },
      { path: '/profile/favorites',   element: <Suspense fallback={<PageLoader />}><Favorites /></Suspense> },
      { path: '/profile/pro-tags',    element: <Suspense fallback={<PageLoader />}><ProTags /></Suspense> },

      // Admin
      { path: '/admin',               element: <Suspense fallback={<PageLoader />}><Admin /></Suspense> },
      { path: '/admin/stats',         element: <Suspense fallback={<PageLoader />}><AdminStats /></Suspense> },
    ],
  },

  // 404 → racine (qui route intelligemment)
  { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default router
