import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'

/**
 * Sélecteur de sanction — s'ouvre après « Valider le signalement ».
 * Étape 2 du flux de modération : l'admin a jugé le signalement fondé, il
 * choisit l'action dans une liste (radio) puis confirme avec « Valider ».
 *
 * Le bouton Valider passe en ROUGE quand l'action sélectionnée est destructive
 * (suspension définitive / suppression du vœu) pour signaler la gravité.
 *
 * Props :
 *  - open / onClose
 *  - report : le signalement concerné (type, reported_user, reported_wish…)
 *  - onApply(kind) : applique la sanction. Le PARENT fait l'action + le toast
 *    + ferme la feuille en cas de succès. En cas d'échec il throw → la feuille
 *    sort du busy mais reste ouverte pour réessayer.
 */

const OPTIONS = [
  { kind: 'none', label: 'Aucune sanction', desc: 'Classer comme fondé, sans action sur l’auteur.', tone: 'neutral' },
  { kind: 'warn', label: 'Avertir l’auteur', desc: 'Envoyer une notification d’avertissement.', tone: 'warn', needsUser: true },
  { kind: 'suspend7', label: 'Suspendre 7 jours', desc: 'Suspension temporaire de l’auteur.', tone: 'warn', needsUser: true },
  { kind: 'suspendDef', label: 'Suspension définitive', desc: 'Bannir définitivement l’auteur de l’application.', tone: 'danger', needsUser: true },
  { kind: 'deleteWish', label: 'Supprimer le vœu', desc: 'Retirer définitivement le vœu signalé.', tone: 'danger', wishOnly: true },
]

export default function SanctionSheet({ open, onClose, report, onApply }) {
  const [selected, setSelected] = useState(null) // kind choisi
  const [busy, setBusy] = useState(false)

  // Reset à chaque fermeture
  useEffect(() => {
    if (!open) { setSelected(null); setBusy(false) }
  }, [open])

  const hasUser = !!report?.reported_user_id
  const isWish = report?.type === 'voeu' && !!report?.reported_wish_id
  const pseudo = report?.reported_user?.pseudo || report?.reported_user?.prenom || 'cet utilisateur'
  const opts = OPTIONS.filter((o) => (!o.needsUser || hasUser) && (!o.wishOnly || isWish))
  const current = opts.find((o) => o.kind === selected) || null
  const destructive = current?.tone === 'danger'

  const labelColor = (tone) =>
    tone === 'danger' ? 'text-[#EF4444]' : tone === 'warn' ? 'text-[#F59E0B]' : 'text-[#1A1A2E]'

  async function handleValidate() {
    if (!current || busy) return
    setBusy(true)
    try { await onApply(current.kind) } catch { /* le parent a déjà affiché l'erreur */ } finally { setBusy(false) }
  }

  return (
    <BottomSheet open={open} onClose={() => { if (!busy) onClose?.() }} maxHeight="85vh">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#1A1A2E]">Signalement validé</h2>
        <p className="text-sm text-[#8A8A9A] mt-0.5">Quelle sanction pour @{pseudo} ?</p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {opts.map((o) => {
          const isSel = selected === o.kind
          return (
            <button
              key={o.kind}
              disabled={busy}
              onClick={() => setSelected(o.kind)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all disabled:opacity-50"
              style={isSel ? { borderColor: '#5B6BF5', background: '#EEF0FF' } : { borderColor: '#F0F0F2' }}
            >
              <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSel ? 'border-[#5B6BF5]' : 'border-[#D0D0D0]'}`}>
                {isSel && <span className="w-2 h-2 rounded-full bg-[#5B6BF5]" />}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${labelColor(o.tone)}`}>{o.label}</span>
                <span className="block text-xs text-[#8A8A9A] mt-0.5">{o.desc}</span>
              </span>
            </button>
          )
        })}
      </div>

      <button
        onClick={handleValidate}
        disabled={!current || busy}
        className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
        style={destructive ? { background: '#EF4444' } : { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
      >
        {busy ? 'Patiente…' : 'Valider'}
      </button>
      <button onClick={onClose} disabled={busy} className="w-full mt-3 text-sm text-[#8A8A9A] text-center disabled:opacity-50">
        Annuler
      </button>
    </BottomSheet>
  )
}
