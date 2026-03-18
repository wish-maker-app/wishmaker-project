import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import BottomTabBar from '../../components/layout/BottomTabBar'
import { MOCK_MESSAGES } from '../../data/mock'

function Avatar({ user, size = 52 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-bold text-white overflow-hidden"
        style={{ width: size, height: size, background: 'linear-gradient(135deg,#8A8A9A,#B0B0B0)' }}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{initials}</span>
        )}
      </div>
      {user.is_online && (
        <span className="absolute bottom-0.5 left-0.5 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white" />
      )}
    </div>
  )
}

function ConversationItem({ conv, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-3 w-full px-5 py-3 text-left"
    >
      <Avatar user={conv.interlocuteur} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-[#1A1A2E] truncate">
          {conv.interlocuteur.prenom} {conv.interlocuteur.nom}
        </p>
        <p className="text-[13px] text-[#8A8A9A] truncate">{conv.dernier_message}</p>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className="text-[12px] text-[#8A8A9A]">{conv.heure}</span>
        {conv.non_lus > 0 && (
          <span className="w-5 h-5 rounded-full bg-[#5B6BF5] text-white text-[10px] font-bold flex items-center justify-center">
            {conv.non_lus}
          </span>
        )}
      </div>
    </motion.button>
  )
}

export default function Inbox() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [tab, setTab] = useState('missions')
  const [search, setSearch] = useState('')

  const filtered = MOCK_MESSAGES
    .filter(c => tab === 'missions' ? c.type === 'mission' : c.type === 'voeu')
    .filter(c =>
      !search ||
      `${c.interlocuteur.prenom} ${c.interlocuteur.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      c.dernier_message.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="px-5 pt-14 pb-2">
        <h1 className="text-xl font-bold text-[#1A1A2E] text-center">{t('messages.titre')}</h1>
      </div>

      {/* Barre de recherche */}
      <div className="px-5 pt-3 pb-2">
        <div className="relative flex items-center">
          <svg className="absolute left-4 text-[#8A8A9A]" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8A8A9A" strokeWidth="2"/>
            <path d="M21 21l-3.5-3.5" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('messages.recherche')}
            className="w-full h-12 bg-white border border-[#E8E8E8] rounded-full pl-10 pr-12 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none focus:border-[#5B6BF5] transition-colors"
          />
          <button className="absolute right-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M8 12h8M11 18h2" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Toggle Mes voeux / Mes missions */}
      <div className="px-5 py-2">
        <div className="flex bg-[#F5F5F5] rounded-full p-1">
          <button
            onClick={() => setTab('voeux')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
            style={tab === 'voeux'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            {t('messages.mes_voeux')}
          </button>
          <button
            onClick={() => setTab('missions')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
            style={tab === 'missions'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            {t('messages.mes_missions')}
          </button>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="flex-1 pb-28 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              onClick={() => navigate(`/messages/${conv.id}`)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#E0E0E0" strokeWidth="1.5"/>
            </svg>
            <p className="text-[#8A8A9A] text-sm">{t('messages.vide')}</p>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
