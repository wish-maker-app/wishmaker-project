import { useNavigate } from 'react-router-dom'

/**
 * Header réutilisable
 * - Bouton retour rond gris à gauche
 * - Titre centré
 * - Action optionnelle à droite
 */
export default function Header({ title = '', onBack = null, rightAction = null, transparent = false }) {
  const navigate = useNavigate()
  const handleBack = onBack || (() => navigate(-1))

  return (
    <div className={`flex items-center justify-between p-5 ${transparent ? 'absolute top-0 left-0 right-0 z-10' : 'relative'}`}>
      {/* Bouton retour */}
      <button
        onClick={handleBack}
        className={`w-10 h-10 rounded-full flex items-center justify-center
          ${transparent ? 'bg-white/20 backdrop-blur' : 'bg-[#F5F5F7]'}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 19l-7-7 7-7" stroke={transparent ? 'white' : '#1A1A2E'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Titre — centré en absolu pour ne jamais se décaler quand rightAction change de largeur */}
      {title && (
        <h1 className={`absolute left-1/2 -translate-x-1/2 max-w-[55%] truncate text-center font-bold text-base ${transparent ? 'text-white' : 'text-[#1A1A2E]'}`}>
          {title}
        </h1>
      )}

      {/* Action droite */}
      <div className="min-w-[40px] flex justify-end">{rightAction}</div>
    </div>
  )
}
