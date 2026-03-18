import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import useAuthStore from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'

export default function Chat() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const userId = useAuthStore((s) => s.user?.id)
  const { messages, loadMessages, sendMessage, loadConversations, conversations, loading } = useMessages()
  const [interlocuteur, setInterlocuteur] = useState({ prenom: 'Utilisateur', nom: '', is_online: false })

  useEffect(() => {
    loadMessages(id)
    // Load conversation info for header
    loadConversations().then(() => {})
  }, [id])

  useEffect(() => {
    // Find interlocuteur from conversations
    const conv = conversations.find((c) => c.id === id)
    if (conv) {
      const isWisher = conv.wisher_id === userId
      setInterlocuteur(isWisher ? conv.maker : conv.wisher)
    }
  }, [conversations, id, userId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage(id, input.trim())
    setInput('')
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

      {/* Header */}
      <div className="bg-white px-4 pt-14 pb-3 flex items-center gap-3 border-b border-[#F0F0F0]">
        <button onClick={() => navigate('/messages')} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs"
            style={{ background: 'linear-gradient(135deg,#8A8A9A,#B0B0B0)' }}>
            {interlocuteur?.prenom?.[0]}{interlocuteur?.nom?.[0]}
          </div>
          {interlocuteur.is_online && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[#1A1A2E] truncate">
            {interlocuteur.prenom} {interlocuteur.nom}
          </p>
          <p className="text-[11px] text-[#8A8A9A]">
            {interlocuteur.is_online ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
        <button className="p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="#1A1A2E"/>
            <circle cx="12" cy="12" r="1.5" fill="#1A1A2E"/>
            <circle cx="12" cy="19" r="1.5" fill="#1A1A2E"/>
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId
          const time = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : ''
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] px-4 py-2.5 ${
                isMe
                  ? 'rounded-[18px_18px_4px_18px] text-white'
                  : 'rounded-[18px_18px_18px_4px] bg-white text-[#1A1A2E] border border-[#F0F0F0]'
              }`}
                style={isMe ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' } : undefined}
              >
                <p className="text-[14px] leading-relaxed">{msg.contenu}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-[#8A8A9A]'}`}>
                  {time}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white border-t border-[#F0F0F0] px-4 py-3 flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('messages.envoyer')}
          className="flex-1 h-11 bg-[#F5F5F5] rounded-full px-4 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none"
        />
        <button
          type="submit"
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 2L15 22l-4-9-9-4L22 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  )
}
