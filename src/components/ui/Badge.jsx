/**
 * Badge statut vœu
 */
export default function Badge({ statut }) {
  const styles = {
    en_attente: { bg: '#EEF2FF', text: '#5B6BF5', label: 'En attente' },
    en_cours:   { bg: '#FFF3DC', text: '#F59E0B', label: 'En cours' },
    realise:    { bg: '#DCFCE7', text: '#16A34A', label: 'Réalisé' },
    annule:     { bg: '#FFE4E4', text: '#EF4444', label: 'Annulé' },
  }
  const s = styles[statut] || styles.en_attente
  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}
