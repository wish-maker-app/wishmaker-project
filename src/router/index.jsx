import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import useAuthStore from '../store/authStore'

// Pages — chargement lazy pour les performances
import { lazy, Suspense } from 'react'

const Splash = lazy(() => import('../pages/Splash'))

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
const SelectLanguage    = lazy(() => import('../pages/Setup/SelectLanguage'))
const ChooseLocation    = lazy(() => import('../pages/Setup/ChooseLocation'))
const ChooseLocationMap = lazy(() => import('../pages/Setup/ChooseLocationMap'))

// Wisher
const WisherHome    = lazy(() => import('../pages/Wisher/Home'))
const MesVoeux      = lazy(() => import('../pages/Wisher/MesVoeux'))
const CreateStep1   = lazy(() => import('../pages/Wisher/CreateWish/Step1'))
const CreateStep2   = lazy(() => import('../pages/Wisher/CreateWish/Step2'))
const CreateStep3   = lazy(() => import('../pages/Wisher/CreateWish/Step3'))
const CreateStep4   = lazy(() => import('../pages/Wisher/CreateWish/Step4'))
const CreateRecap   = lazy(() => import('../pages/Wisher/CreateWish/Recap'))
const CreateSuccess = lazy(() => import('../pages/Wisher/CreateWish/Success'))

// Maker
const MakerHome   = lazy(() => import('../pages/Maker/Home'))
const MakerSearch = lazy(() => import('../pages/Maker/Search'))
const MakerFilters = lazy(() => import('../pages/Maker/Filters'))
const WishDetail  = lazy(() => import('../pages/Maker/WishDetail'))
const MakerSuccess = lazy(() => import('../pages/Maker/Success'))

// Messages
const Inbox = lazy(() => import('../pages/Messages/Inbox'))
const Chat  = lazy(() => import('../pages/Messages/Chat'))

// Profile
const Profile = lazy(() => import('../pages/Profile/index'))
const EditProfile = lazy(() => import('../pages/Profile/EditProfile'))

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

function ProtectedRoute() {
  const { user, profile } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  if (profile && !profile.onboarding_completed) return <Navigate to="/setup/langue" replace />
  return <Outlet />
}

function SetupRoute() {
  const { user, profile } = useAuthStore()
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.onboarding_completed) return <Navigate to="/wisher" replace />
  return <Outlet />
}

function PublicRoute() {
  const { user, profile } = useAuthStore()
  if (user && profile?.onboarding_completed) return <Navigate to="/wisher" replace />
  return <Outlet />
}

// ──────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/splash" replace />,
  },
  {
    path: '/splash',
    element: <Suspense fallback={<PageLoader />}><Splash /></Suspense>,
  },

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
      { path: 'langue',            element: <Suspense fallback={<PageLoader />}><SelectLanguage /></Suspense> },
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
      { path: '/wisher/mes-voeux',     element: <Suspense fallback={<PageLoader />}><MesVoeux /></Suspense> },
      { path: '/wisher/create/1',      element: <Suspense fallback={<PageLoader />}><CreateStep1 /></Suspense> },
      { path: '/wisher/create/2',      element: <Suspense fallback={<PageLoader />}><CreateStep2 /></Suspense> },
      { path: '/wisher/create/3',      element: <Suspense fallback={<PageLoader />}><CreateStep3 /></Suspense> },
      { path: '/wisher/create/4',      element: <Suspense fallback={<PageLoader />}><CreateStep4 /></Suspense> },
      { path: '/wisher/create/recap',  element: <Suspense fallback={<PageLoader />}><CreateRecap /></Suspense> },
      { path: '/wisher/create/success', element: <Suspense fallback={<PageLoader />}><CreateSuccess /></Suspense> },

      // Maker
      { path: '/maker',               element: <Suspense fallback={<PageLoader />}><MakerHome /></Suspense> },
      { path: '/maker/search',        element: <Suspense fallback={<PageLoader />}><MakerSearch /></Suspense> },
      { path: '/maker/filters',       element: <Suspense fallback={<PageLoader />}><MakerFilters /></Suspense> },
      { path: '/maker/wish/:id',      element: <Suspense fallback={<PageLoader />}><WishDetail /></Suspense> },
      { path: '/maker/success',       element: <Suspense fallback={<PageLoader />}><MakerSuccess /></Suspense> },

      // Messages
      { path: '/messages',            element: <Suspense fallback={<PageLoader />}><Inbox /></Suspense> },
      { path: '/messages/:id',        element: <Suspense fallback={<PageLoader />}><Chat /></Suspense> },

      // Profile
      { path: '/profile',             element: <Suspense fallback={<PageLoader />}><Profile /></Suspense> },
      { path: '/profile/edit',        element: <Suspense fallback={<PageLoader />}><EditProfile /></Suspense> },
    ],
  },

  // 404 → splash
  { path: '*', element: <Navigate to="/splash" replace /> },
])

export default router
