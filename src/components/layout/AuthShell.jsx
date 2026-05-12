/**
 * AuthShell : wrapper sobre pour toutes les pages /auth/*.
 *
 * Inspiration : Notion / Linear login. Fond blanc uniforme partout,
 * pas de panneau lateral, pas d'effet boxe. Le formulaire est centre
 * horizontalement (max-w-[460px]) sur desktop, mobile-first preserve.
 *
 * Wrapper fixed inset-0 z-[1000] pour s'echapper du shell global #root
 * 430px (cf src/index.css). Sans ca, le formulaire serait coince dans
 * une bande de 430px avec un fond gris autour, ce qui fait "boxe".
 */
export default function AuthShell({ children }) {
  return (
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-white"
      style={{ width: '100vw', maxWidth: '100vw' }}
    >
      {children}
    </div>
  )
}
