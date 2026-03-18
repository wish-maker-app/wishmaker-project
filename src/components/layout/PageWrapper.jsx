import { motion } from 'framer-motion'

/**
 * Wrapper de page — fadeIn + slide up
 * withNav : ajoute padding-bottom pour la BottomTabBar
 */
export default function PageWrapper({ children, withNav = false, className = '' }) {
  return (
    <motion.div
      className={`min-h-screen bg-white ${withNav ? 'pb-[72px]' : ''} ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}
