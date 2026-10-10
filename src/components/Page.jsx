import { motion } from 'framer-motion';
import { T } from '../theme';
import { useResponsive } from '../hooks';

export default function Page({ title, subtitle, action, children }) {
  const { isMobile } = useResponsive();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'flex-end',
          justifyContent: 'space-between',
          gap: 18,
          marginBottom: 26,
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 34px)', fontWeight: 800 }}>{title}</h1>
          {subtitle && (
            <p style={{ margin: '6px 0 0', color: T.muted, fontSize: 14 }}>{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}