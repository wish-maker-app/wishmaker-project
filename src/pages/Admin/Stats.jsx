import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, withTimeout, ensureSession } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import { getCached, setCached } from '../../lib/wishesCache'

/**
 * Page Admin Stats — KPIs metier essentiels pour Christophe / Bastien.
 *
 * Tout est calcule cote serveur en UNE requete via la RPC get_admin_stats()
 * (au lieu de 10 requetes client qui rapatriaient des tables entieres).
 * Le resultat est mis en cache (cache memoire partage) -> reouverture instant,
 * refresh silencieux en fond facon SWR.
 *
 * Phase 2 (plus tard) : analytics web via Plausible / events PostHog.
 */
export default function AdminStats() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  // Hydrate depuis le cache -> affichage instant a la reouverture
  const [data, setData] = useState(() => getCached('admin_stats')?.value || null)
  const [loading, setLoading] = useState(() => !getCached('admin_stats'))

  const authTick = useAuthStore((s) => s.authTick)
  const isAdmin = !!(user && profile?.is_admin)

  // useEffect AVANT tout return conditionnel (regles des hooks). On ne charge
  // que si admin. authTick → re-tente au réveil de l'app (focus/visibility).
  useEffect(() => {
    if (isAdmin) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, authTick])

  async function loadStats() {
    if (!getCached('admin_stats')) setLoading(true)
    try {
      await ensureSession()
      // withTimeout : sinon, au réveil PWA (connexion HTTP/2 morte), le RPC peut
      // ne JAMAIS résoudre → le finally ne tourne pas → spinner infini.
      const { data: stats, error } = await withTimeout(supabase.rpc('get_admin_stats'))
      if (error) throw error
      setData(stats)
      setCached('admin_stats', stats)
    } catch (err) {
      console.error('[admin/stats] error:', err?.message)
    } finally {
      setLoading(false)
    }
  }

  // Garde admin cote client (la RLS BDD + la RPC sont la vraie barriere)
  if (!isAdmin) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg font-bold text-[#EF4444]">Accès refusé</p>
        <p className="text-sm text-[#8A8A9A] text-center">Réservé aux administrateurs.</p>
        <button onClick={() => navigate('/wisher')} className="h-12 px-8 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
          Retour
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-screen bg-[#F5F5F7] flex items-center justify-center px-6">
        <p className="text-sm text-[#8A8A9A]">Impossible de charger les statistiques.</p>
      </div>
    )
  }

  const { kpis, usersSeries, wishesSeries, topTags, topCities } = data

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-4 pb-3 flex items-center gap-3 border-b border-[#F0F0F0] flex-shrink-0">
        <button
          onClick={() => {
            // Retour intelligent : history back si possible (preserve le contexte
            // de l'utilisateur qui peut venir de /profile ou /admin), sinon /profile
            if (window.history.length > 1) navigate(-1)
            else navigate('/profile')
          }}
          className="w-10 h-10 rounded-full bg-[#F5F5F7] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[#1A1A2E]">Statistiques</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-20 flex flex-col gap-5">

        {/* ── 4 KPI cards ── */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            label="Utilisateurs"
            value={kpis.users.total}
            delta={kpis.users.week}
            deltaLabel="cette semaine"
            color="#5B6BF5"
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6M23 11h-6" />
              </svg>
            )}
          />
          <KPICard
            label="Vœux publiés"
            value={kpis.wishes.total}
            delta={kpis.wishes.week}
            deltaLabel="cette semaine"
            color="#9B59F5"
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            )}
          />
          <KPICard
            label="Mises en relation"
            value={kpis.conversations.total}
            color="#22C55E"
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
          />
          <KPICard
            label="Transactions"
            value={kpis.transactions.count}
            delta={`${(kpis.transactions.sum / 100).toFixed(2)} €`}
            deltaLabel="total encaissé"
            color="#F59E0B"
            icon={(
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            )}
          />
        </div>

        {/* ── Graphique inscriptions 30j ── */}
        <ChartCard title="Inscriptions — 30 derniers jours" series={usersSeries} color="#5B6BF5" />

        {/* ── Graphique vœux 30j ── */}
        <ChartCard title="Vœux publiés — 30 derniers jours" series={wishesSeries} color="#9B59F5" />

        {/* ── Top tags ── */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0F0F0]">
          <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">Top 10 mots-clés</h2>
          {topTags.length === 0 ? (
            <p className="text-xs text-[#8A8A9A]">Aucun tag utilisé pour l'instant.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topTags.map(([label, count], i) => {
                const max = topTags[0][1]
                const pct = Math.max(8, (count / max) * 100)
                return (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#8A8A9A] w-5 text-right">{i + 1}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-6 rounded-md overflow-hidden bg-[#F5F5F7] relative">
                        <div className="h-full rounded-md transition-all"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)',
                          }} />
                      </div>
                      <span className="text-xs font-semibold text-[#1A1A2E] w-32 truncate">{label}</span>
                      <span className="text-xs font-bold text-[#5B6BF5] w-8 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Top villes ── */}
        <div className="bg-white rounded-2xl p-5 border border-[#F0F0F0]">
          <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">Top 10 villes</h2>
          {topCities.length === 0 ? (
            <p className="text-xs text-[#8A8A9A]">Aucune ville renseignée.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topCities.map(([ville, count], i) => {
                const max = topCities[0][1]
                const pct = Math.max(8, (count / max) * 100)
                return (
                  <div key={ville} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-[#8A8A9A] w-5 text-right">{i + 1}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-6 rounded-md overflow-hidden bg-[#F5F5F7] relative">
                        <div className="h-full rounded-md transition-all"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg,#22C55E,#5B6BF5)',
                          }} />
                      </div>
                      <span className="text-xs font-semibold text-[#1A1A2E] w-32 truncate">{ville}</span>
                      <span className="text-xs font-bold text-[#22C55E] w-8 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-[11px] text-[#8A8A9A] text-center pt-2">
          Données mises à jour à chaque visite de cette page.
        </p>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Sous-composants
// ──────────────────────────────────────────────

function KPICard({ label, value, delta, deltaLabel, color, icon }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#F0F0F0] flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-[11px] font-semibold text-[#8A8A9A] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[24px] font-bold tracking-[-0.02em] text-[#1A1A2E] leading-tight">{value}</p>
      {delta !== undefined && (
        <p className="text-[11px] text-[#8A8A9A]">
          <span className="font-bold" style={{ color }}>+{delta}</span> {deltaLabel}
        </p>
      )}
    </div>
  )
}

function ChartCard({ title, series, color }) {
  const max = Math.max(1, ...series.map(s => s.value))
  const w = 320
  const h = 80
  const padding = 4
  const stepX = (w - padding * 2) / Math.max(1, series.length - 1)

  const points = series.map((s, i) => {
    const x = padding + i * stepX
    const y = padding + (h - padding * 2) * (1 - s.value / max)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${padding},${h - padding} ${points} ${padding + (series.length - 1) * stepX},${h - padding}`

  const total = series.reduce((acc, s) => acc + s.value, 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#F0F0F0]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#1A1A2E]">{title}</h2>
        <span className="text-xs font-bold" style={{ color }}>{total} au total</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-[#8A8A9A]">
        <span>il y a 30j</span>
        <span>aujourd'hui</span>
      </div>
    </div>
  )
}
