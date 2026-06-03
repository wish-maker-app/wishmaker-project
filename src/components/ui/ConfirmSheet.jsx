import BottomSheet from './BottomSheet'

/**
 * Modal de confirmation réutilisable (remplace window.confirm — plus propre,
 * cohérent avec la charte). Double-vérif avant une action sensible.
 *
 * Props :
 *  - open / onClose
 *  - title : question principale
 *  - message : précision (optionnel)
 *  - confirmLabel / cancelLabel
 *  - destructive : bouton rouge si true, sinon gradient brand
 *  - loading : désactive pendant l'action
 *  - onConfirm : callback exécuté au clic sur confirmer
 */
export default function ConfirmSheet({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  destructive = false,
  loading = false,
  onConfirm,
}) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">{title}</h2>
        {message && <p className="text-sm text-[#8A8A9A] leading-relaxed">{message}</p>}
      </div>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
        style={destructive ? { background: '#EF4444' } : { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
      >
        {loading ? 'Patiente…' : confirmLabel}
      </button>
      <button onClick={onClose} disabled={loading} className="w-full mt-3 text-sm text-[#8A8A9A] text-center disabled:opacity-50">
        {cancelLabel}
      </button>
    </BottomSheet>
  )
}
