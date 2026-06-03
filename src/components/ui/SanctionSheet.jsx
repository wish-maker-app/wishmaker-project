import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'

/**
 * Sélecteur de sanction — s'ouvre après « Valider le signalement ».
 * Étape 2 du flux de modération : l'admin a jugé le signalement fondé, il
 * décide maintenant quoi faire.
 *
 * Feuille à 2 phases dans un SEUL BottomSheet (pas de sheets empilés) :
 *  - Phase 1 : liste des sanctions possibles
 *  - Phase 2 : confirmation inline pour les actions irréversibles
 *    (suspension définitive, suppression du vœu)
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
  { kind: 'suspendDef', label: 'Suspension définitive', desc: 'Bannir définitivement l’auteur de l’application.', tone: 'danger', needsUser: true, confirm: true },
  { kind: 'deleteWish', label: 'Supprimer le vœu', desc: 'Retirer définitivement le vœu signalé.', tone: 'danger', wishOnly: true, confirm: true },
]

export default function SanctionSheet({ open, onClose, report, onApply }) {
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState(null) // option en attente de confirmation (phase 2)

  // Reset l'état interne à chaque fermeture
  useEffect(() => {
    if (!open) { setPending(null); setBusy(false) }
  }, [open])

  const hasUser = !!report?.reported_user_id
  const isWish = report?.type === 'voeu' && !!report?.reported_wish_id
  const pseudo = report?.reported_user?.pseudo || report?.reported_user?.prenom || 'cet utilisateur'
  const opts = OPTIONS.filter((o) => (!o.needsUser || hasUser) && (!o.wishOnly || isWish))

  async function apply(kind) {
    setBusy(true)
    try { await onApply(kind) } catch { /* le parent a déjà affiché l'erreur */ } finally { setBusy(false) }
  }

  function pick(o) {
    if (o.confirm) setPending(o)
    else apply(o.kind)
  }

  const toneClass = (tone) =>
    tone === 'danger' ? 'text-[#EF4444]' : tone === 'warn' ? 'text-[#F59E0B]' : 'text-[#1A1A2E]'

  return (
    <BottomSheet open={open} onClose={() => { if (!busy) onClose?.() }} maxHeight="85vh">
      {!pending ? (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#1A1A2E]">Signalement validé</h2>
            <p className="text-sm text-[#8A8A9A] mt-0.5">Quelle sanction pour @{pseudo} ?</p>
          </div>
          <div className="flex flex-col gap-2">
            {opts.map((o) => (
              <button
                key={o.kind}
                disabled={busy}
                onClick={() => pick(o)}
                className="text-left p-3.5 rounded-2xl border border-[#F0F0F2] active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                <p className={`text-sm font-semibold ${toneClass(o.tone)}`}>{o.label}</p>
                <p className="text-xs text-[#8A8A9A] mt-0.5">{o.desc}</p>
              </button>
            ))}
          </div>
          <button onClick={onClose} disabled={busy} className="w-full mt-3 text-sm text-[#8A8A9A] text-center disabled:opacity-50">
            Annuler
          </button>
        </>
      ) : (
        <>
          <div className="text-center mb-5">
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">
              {pending.kind === 'deleteWish' ? 'Supprimer ce vœu ?' : `Suspendre @${pseudo} définitivement ?`}
            </h2>
            <p className="text-sm text-[#8A8A9A] leading-relaxed">
              {pending.kind === 'deleteWish'
                ? `« ${report?.reported_wish?.titre || 'Ce vœu'} » sera supprimé définitivement. Action irréversible.`
                : `@${pseudo} sera banni définitivement de l’application.`}
            </p>
          </div>
          <button
            onClick={() => apply(pending.kind)}
            disabled={busy}
            className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
            style={{ background: '#EF4444' }}
          >
            {busy ? 'Patiente…' : pending.kind === 'deleteWish' ? 'Supprimer le vœu' : 'Suspendre définitivement'}
          </button>
          <button onClick={() => setPending(null)} disabled={busy} className="w-full mt-3 text-sm text-[#8A8A9A] text-center disabled:opacity-50">
            Retour
          </button>
        </>
      )}
    </BottomSheet>
  )
}
