import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase, withTimeout, ensureSession } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'grossierete', label: 'Grossièretés' },
  { value: 'drogue', label: 'Drogues' },
  { value: 'violence', label: 'Violence' },
  { value: 'illicite', label: 'Illicite' },
  { value: 'autre', label: 'Autre' },
]

// ── Onglet 1 : Mots interdits ──
function MotsInterditsTab() {
  const [words, setWords] = useState([])
  const [filter, setFilter] = useState('all')
  const [newMot, setNewMot] = useState('')
  const [newCat, setNewCat] = useState('grossierete')
  const [loading, setLoading] = useState(true)

  async function loadWords() {
    const { data } = await supabase
      .from('forbidden_words')
      .select('*')
      .order('categorie')
      .order('mot')
    setWords(data || [])
    setLoading(false)
  }

  useEffect(() => { loadWords() }, [])

  async function handleAdd() {
    if (!newMot.trim()) return
    const { error } = await supabase.from('forbidden_words').insert({ mot: newMot.trim().toLowerCase(), categorie: newCat })
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ce mot existe déjà.' : error.message)
      return
    }
    toast.success(`"${newMot}" ajouté !`)
    setNewMot('')
    loadWords()
  }

  async function handleDelete(id, mot) {
    const { error } = await supabase.from('forbidden_words').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${mot}" supprimé`)
    loadWords()
  }

  const filtered = filter === 'all' ? words : words.filter(w => w.categorie === filter)

  const catColors = {
    grossierete: { bg: '#FFE4E4', text: '#EF4444' },
    drogue: { bg: '#FFF3DC', text: '#F59E0B' },
    violence: { bg: '#FFE4E4', text: '#DC2626' },
    illicite: { bg: '#E6F1FB', text: '#0C447C' },
    autre: { bg: '#F0F0F5', text: '#8A8A9A' },
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres catégorie */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={filter === c.value
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { background: '#F5F5F7', color: '#8A8A9A' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Compteur */}
      <p className="text-xs text-[#8A8A9A]">{filtered.length} mot{filtered.length > 1 ? 's' : ''}</p>

      {/* Liste */}
      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-3 border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#8A8A9A] text-center py-4">Aucun mot dans cette catégorie</p>
        ) : (
          filtered.map(w => {
            const colors = catColors[w.categorie] || catColors.autre
            return (
              <div key={w.id} className="flex items-center justify-between bg-white border border-[#F0F0F0] rounded-[14px] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-[#1A1A2E]">{w.mot}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
                    {w.categorie}
                  </span>
                </div>
                <button onClick={() => handleDelete(w.id, w.mot)} className="text-[#EF4444] text-xs font-semibold">
                  Supprimer
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Formulaire ajout */}
      <div className="bg-[#F5F5F7] rounded-[20px] p-4 flex flex-col gap-3 mt-2">
        <p className="text-sm font-bold text-[#1A1A2E]">Ajouter un mot</p>
        <input
          value={newMot}
          onChange={e => setNewMot(e.target.value)}
          placeholder="Nouveau mot interdit..."
          className="h-12 bg-white rounded-[14px] px-4 text-sm text-[#1A1A2E] outline-none border border-[#E8E8E8] focus:border-[#5B6BF5]"
        />
        <select
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          className="h-12 bg-white rounded-[14px] px-4 text-sm text-[#1A1A2E] outline-none border border-[#E8E8E8] focus:border-[#5B6BF5]"
        >
          {CATEGORIES.filter(c => c.value !== 'all').map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!newMot.trim()}
          className="h-12 rounded-full text-white font-bold text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}

// ── Onglet 2 : Utilisateurs suspendus ──
function UtilisateursTab() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ temp: 0, def: 0, reports: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const authTick = useAuthStore((s) => s.authTick)

  async function loadData() {
    setError(false)
    try {
      await ensureSession()
      // withTimeout : sans ça, une requête qui hang (réveil PWA / connexion
      // morte) laissait setLoading(false) inatteignable → SPINNER INFINI. Le
      // try/finally garantit désormais qu'on sort TOUJOURS du loading.
      const { data: suspended, error: e1 } = await withTimeout(
        supabase.from('users').select('*').eq('is_suspended', true)
      )
      if (e1) throw e1
      setUsers(suspended || [])

      const temp = (suspended || []).filter(u => u.suspension_type === 'temporaire').length
      const def = (suspended || []).filter(u => u.suspension_type === 'definitive').length

      const { count: reportsCount, error: e2 } = await withTimeout(
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
      )
      if (e2) throw e2
      setStats({ temp, def, reports: reportsCount || 0 })
    } catch (err) {
      console.error('[admin users] load error:', err?.message)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTick])

  async function liftSuspension(userId) {
    // RPC admin (la RLS users est verrouillée au propriétaire → update direct
    // échouait silencieusement). La fonction vérifie is_admin côté serveur.
    const { error } = await supabase.rpc('admin_lift_suspension', { p_user_id: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Suspension levée')
    loadData()
  }

  async function makeDefinitive(userId) {
    const { error } = await supabase.rpc('admin_make_suspension_definitive', { p_user_id: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Suspension rendue définitive')
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-bold text-[#1A1A2E]">Erreur de chargement</p>
        <p className="text-xs text-[#8A8A9A]">Vérifie ta connexion et réessaie.</p>
        <button
          onClick={() => { setLoading(true); loadData() }}
          className="mt-2 h-10 px-5 rounded-full text-white font-bold text-xs"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#FFF3DC] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#F59E0B]">{stats.temp}</p>
          <p className="text-[10px] text-[#F59E0B] font-medium mt-1">Temporaires</p>
        </div>
        <div className="bg-[#FFE4E4] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#EF4444]">{stats.def}</p>
          <p className="text-[10px] text-[#EF4444] font-medium mt-1">Définitifs</p>
        </div>
        <div className="bg-[#E6F1FB] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#0C447C]">{stats.reports}</p>
          <p className="text-[10px] text-[#0C447C] font-medium mt-1">Signalements</p>
        </div>
      </div>

      {/* Liste */}
      {users.length === 0 ? (
        <p className="text-sm text-[#8A8A9A] text-center py-8">Aucun utilisateur suspendu</p>
      ) : (
        users.map(u => (
          <div key={u.id} className="bg-white border border-[#F0F0F0] rounded-[20px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1A1A2E] text-sm">@{u.pseudo || `user_${u.id.slice(0,4)}`}</p>
                <p className="text-[11px] text-[#8A8A9A]">{u.email}</p>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={u.suspension_type === 'definitive'
                  ? { background: '#FFE4E4', color: '#EF4444' }
                  : { background: '#FFF3DC', color: '#F59E0B' }
                }
              >
                {u.suspension_type === 'definitive' ? 'Définitif' : 'Temporaire'}
              </span>
            </div>

            {u.suspension_type === 'temporaire' && u.suspended_until && (
              <p className="text-xs text-[#8A8A9A]">
                Fin : {new Date(u.suspended_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            <p className="text-xs text-[#8A8A9A]">
              Suspensions antérieures : {u.suspension_count || 0}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => liftSuspension(u.id)}
                className="flex-1 h-10 rounded-full text-xs font-semibold bg-[#F5F5F7] text-[#1A1A2E] active:scale-[0.98] transition-transform"
              >
                Lever la suspension
              </button>
              {u.suspension_type !== 'definitive' && (
                <button
                  onClick={() => makeDefinitive(u.id)}
                  className="flex-1 h-10 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#EF4444] active:scale-[0.98] transition-transform"
                >
                  Rendre définitive
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ── Onglet 3 : Signalements (file de modération) ──
function SignalementsTab() {
  const navigate = useNavigate()
  const authTick = useAuthStore((s) => s.authTick)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(null) // id du signalement en cours d'action

  async function loadReports() {
    setError(false)
    try {
      await ensureSession()
      const { data, error: e } = await withTimeout(supabase
        .from('reports')
        .select(`id, type, raison, created_at, reported_wish_id, reported_user_id,
          reporter:users!reports_reporter_id_fkey(pseudo, prenom),
          reported_user:users!reports_reported_user_id_fkey(id, pseudo, prenom, is_suspended),
          reported_wish:wishes!reports_reported_wish_id_fkey(id, titre)`)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false }))
      if (e) throw e
      setReports(data || [])
    } catch (err) {
      console.error('[admin reports] load error:', err?.message)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTick])

  // Marque un signalement traité / rejeté (la policy reports_update_admin autorise l'admin)
  async function setStatut(reportId, statut, msg) {
    setActing(reportId)
    const { error: e } = await supabase.from('reports').update({ statut }).eq('id', reportId)
    setActing(null)
    if (e) { toast.error(e.message); return }
    toast.success(msg)
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  async function suspendUser(r) {
    if (!r.reported_user_id) { toast.error('Aucun utilisateur cible'); return }
    if (!window.confirm(`Suspendre @${r.reported_user?.pseudo || 'cet utilisateur'} 7 jours ?`)) return
    setActing(r.id)
    const { error: e } = await supabase.rpc('admin_suspend_user', { p_user_id: r.reported_user_id, p_type: 'temporaire', p_days: 7 })
    if (e) { setActing(null); toast.error(e.message); return }
    await supabase.from('reports').update({ statut: 'traite' }).eq('id', r.id)
    setActing(null)
    toast.success('Utilisateur suspendu 7 jours')
    setReports((prev) => prev.filter((x) => x.id !== r.id))
  }

  async function deleteWish(r) {
    if (!r.reported_wish_id) { toast.error('Aucun vœu cible'); return }
    if (!window.confirm(`Supprimer définitivement le vœu « ${r.reported_wish?.titre || ''} » ?`)) return
    setActing(r.id)
    const { error: e } = await supabase.rpc('admin_delete_wish', { p_wish_id: r.reported_wish_id })
    if (e) { setActing(null); toast.error(e.message); return }
    await supabase.from('reports').update({ statut: 'traite' }).eq('id', r.id)
    setActing(null)
    toast.success('Vœu supprimé')
    setReports((prev) => prev.filter((x) => x.id !== r.id))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-bold text-[#1A1A2E]">Erreur de chargement</p>
        <button onClick={() => { setLoading(true); loadReports() }} className="mt-1 h-10 px-5 rounded-full text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>Réessayer</button>
      </div>
    )
  }

  if (reports.length === 0) {
    return <p className="text-sm text-[#8A8A9A] text-center py-10">Aucun signalement en attente</p>
  }

  const pillBtn = 'flex-1 h-10 rounded-full text-xs font-semibold disabled:opacity-40 transition-colors active:scale-[0.98]'

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => {
        const busy = acting === r.id
        return (
          <div key={r.id} className="bg-white border border-[#F0F0F0] rounded-[20px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={r.type === 'voeu' ? { background: '#EEF0FF', color: '#5B6BF5' } : { background: '#FFF3DC', color: '#F59E0B' }}>
                {r.type === 'voeu' ? 'Vœu' : 'Profil'}
              </span>
              <span className="text-[11px] text-[#8A8A9A]">
                {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p className="text-sm text-[#1A1A2E]"><span className="font-semibold">Raison :</span> {r.raison}</p>

            <p className="text-[11px] text-[#8A8A9A] leading-relaxed">
              Signalé par @{r.reporter?.pseudo || r.reporter?.prenom || '?'}
              {' · Cible : '}@{r.reported_user?.pseudo || r.reported_user?.prenom || '?'}
              {r.reported_wish?.titre ? ` · « ${r.reported_wish.titre} »` : ''}
              {r.reported_user?.is_suspended ? ' · (déjà suspendu)' : ''}
            </p>

            {/* Décision sur le signalement (neutre + 1 action primaire) */}
            <div className="flex gap-2 pt-1">
              <button
                disabled={busy}
                onClick={() => {
                  if (r.type === 'voeu' && r.reported_wish_id) navigate(`/maker/wish/${r.reported_wish_id}`)
                  else if (r.reported_user_id) navigate(`/maker/user/${r.reported_user_id}`)
                }}
                className={`${pillBtn} bg-[#F5F5F7] text-[#1A1A2E]`}
              >
                Voir
              </button>
              <button
                disabled={busy}
                onClick={() => setStatut(r.id, 'traite', 'Signalement traité')}
                className={`${pillBtn} text-white`}
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                Traiter
              </button>
              <button
                disabled={busy}
                onClick={() => setStatut(r.id, 'rejete', 'Signalement rejeté')}
                className={`${pillBtn} bg-[#F5F5F7] text-[#8A8A9A]`}
              >
                Rejeter
              </button>
            </div>

            {/* Sanctions — actions destructrices, en rouge doux */}
            <div className="flex gap-2">
              <button disabled={busy} onClick={() => suspendUser(r)} className={`${pillBtn} bg-[#FEF2F2] text-[#EF4444]`}>
                Suspendre l'auteur
              </button>
              {r.type === 'voeu' && r.reported_wish_id && (
                <button disabled={busy} onClick={() => deleteWish(r)} className={`${pillBtn} bg-[#FEF2F2] text-[#EF4444]`}>
                  Supprimer le vœu
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Page Admin ──
export default function Admin() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState('users')

  // Protection admin (1re ligne côté client — la vraie sécurité est la RLS BDD)
  if (!user || !profile?.is_admin) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg font-bold text-[#EF4444]">Accès refusé</p>
        <p className="text-sm text-[#8A8A9A] text-center">Cette page est réservée aux administrateurs.</p>
        <button onClick={() => navigate('/wisher')} className="h-12 px-8 rounded-full text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-3 flex items-center gap-3 border-b border-[#F0F0F0]">
        <button
          onClick={() => {
            if (window.history.length > 1) navigate(-1)
            else navigate('/profile')
          }}
          className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="text-lg font-bold text-[#1A1A2E]">Administration</h1>
      </div>

      {/* Toggle Utilisateurs / Signalements (Mots interdits / Tags gérés en SQL) */}
      <div className="px-5 pt-3">
        <div className="flex bg-[#F5F5F7] rounded-full p-1">
          {[['users', 'Utilisateurs'], ['reports', 'Signalements']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
              style={tab === val
                ? { background: '#fff', color: '#5B6BF5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { color: '#8A8A9A' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-10">
        {tab === 'reports' ? <SignalementsTab /> : <UtilisateursTab />}
      </div>
    </div>
  )
}
