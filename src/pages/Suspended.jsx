import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import { isSuspendedActive } from '../lib/suspension'

/**
 * Écran « compte suspendu » — destination des utilisateurs dont la suspension
 * est ACTIVE (redirigés par ProtectedRoute / RouteResolver). La RLS bloque de
 * toute façon leurs écritures côté serveur ; cet écran explique la situation
 * au lieu de laisser l'app afficher des erreurs incompréhensibles.
 */
export default function Suspended() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const { signOut } = useAuth()

  // Pas connecté → auth. Plus suspendu (fin de peine / levée admin) → app.
  if (!user) {
    navigate('/auth', { replace: true })
    return null
  }
  if (profile && !isSuspendedActive(profile)) {
    navigate('/maker', { replace: true })
    return null
  }

  const definitive = profile?.suspension_type === 'definitive' || !profile?.suspended_until
  const fin = profile?.suspended_until
    ? new Date(profile.suspended_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="h-screen bg-white flex flex-col items-center justify-center px-8">
      <div className="flex flex-col items-center text-center max-w-[340px]">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 bg-[#FEF2F2]">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Compte suspendu</h1>
        <p className="text-sm text-[#8A8A9A] leading-relaxed mb-2">
          {definitive
            ? 'Ton compte a été suspendu définitivement suite à un non-respect des règles de la communauté.'
            : `Ton compte est temporairement suspendu jusqu'au ${fin}.`}
        </p>
        <p className="text-sm text-[#8A8A9A] leading-relaxed mb-8">
          Si tu penses qu'il s'agit d'une erreur, contacte-nous : <span className="font-semibold text-[#5B6BF5]">wm@wishmaker.fr</span>
        </p>
        <button
          onClick={signOut}
          className="w-full h-12 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
