import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import EmailVerifyBanner from '../ui/EmailVerifyBanner'

/**
 * Layout racine monté au-dessus de toutes les routes.
 * Responsabilités :
 *  1. Initialise le hook `useAuth()` pour synchroniser la session Supabase
 *     avec le store Zustand `authStore` (évite les boucles de redirection
 *     après OAuth).
 *  2. Affiche le banner de vérification email pour les users non confirmés
 *     (masqué sur les écrans d'auth et setup pour ne pas surcharger).
 */
export default function RootLayout() {
  useAuth()
  const { pathname } = useLocation()
  const hideBanner =
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/setup') ||
    pathname === '/'

  return (
    <>
      {!hideBanner && <EmailVerifyBanner />}
      <Outlet />
    </>
  )
}
