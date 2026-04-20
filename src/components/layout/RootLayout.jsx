import { Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Layout racine monté au-dessus de toutes les routes.
 * Seule responsabilité : initialiser le hook `useAuth()` pour synchroniser
 * la session Supabase ↔ le store Zustand `authStore`.
 *
 * Sans ça, les guards de routes (ProtectedRoute, SetupRoute, PublicRoute)
 * voient toujours `user: null` même quand une session Supabase est active,
 * ce qui cause des boucles de redirection après OAuth.
 */
export default function RootLayout() {
  useAuth()
  return <Outlet />
}
