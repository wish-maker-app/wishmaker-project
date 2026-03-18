/**
 * Avatar circulaire avec initiales en fallback + pastille online
 */
export default function Avatar({ src, prenom = '', nom = '', size = 44, online = false }) {
  const initiales = `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={`${prenom} ${nom}`}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-bold"
          style={{
            background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)',
            fontSize: size * 0.36,
          }}
        >
          {initiales}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 rounded-full bg-[#22C55E] border-2 border-white"
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  )
}
