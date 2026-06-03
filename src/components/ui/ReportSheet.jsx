import { useState } from 'react'
import BottomSheet from './BottomSheet'

/**
 * Feuille de signalement réutilisable (sélecteur de motif).
 *
 * Props :
 *  - open / onClose
 *  - title : titre du modal
 *  - reasons : string[] des motifs proposés ('Autre' affiche un champ libre)
 *  - onSubmit(raison) : appelé avec le motif final. Le PARENT fait l'insert +
 *    le toast + ferme la feuille en cas de succès (la feuille gère juste l'état
 *    "envoi en cours"). En cas d'échec, le parent ne ferme pas → sélection
 *    conservée pour réessayer.
 */
export default function ReportSheet({ open, onClose, title = 'Signaler', reasons = [], onSubmit }) {
  const [selected, setSelected] = useState('')
  const [other, setOther] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSubmit() {
    const raison = selected === 'Autre' ? other.trim() : selected
    if (!raison || sending) return
    setSending(true)
    try {
      await onSubmit(raison)
    } finally {
      setSending(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="80vh">
      <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">{title}</h2>

      <div className="flex flex-col gap-2 mb-4">
        {reasons.map((reason) => (
          <button
            key={reason}
            onClick={() => setSelected(reason)}
            className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
            style={selected === reason
              ? { borderColor: '#5B6BF5', background: '#EEF0FF' }
              : { borderColor: '#F0F0F0' }}
          >
            <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selected === reason ? 'border-[#5B6BF5]' : 'border-[#D0D0D0]'}`}>
              {selected === reason && <span className="w-2 h-2 rounded-full bg-[#5B6BF5]" />}
            </span>
            <span className="text-sm text-[#1A1A2E]">{reason}</span>
          </button>
        ))}
      </div>

      {selected === 'Autre' && (
        <textarea
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Décrivez la raison..."
          rows={3}
          className="w-full bg-[#F7F8FC] rounded-2xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none mb-4"
        />
      )}

      <button
        onClick={handleSubmit}
        disabled={sending || !selected || (selected === 'Autre' && !other.trim())}
        className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}
      >
        {sending ? 'Envoi...' : 'Envoyer le signalement'}
      </button>
    </BottomSheet>
  )
}
