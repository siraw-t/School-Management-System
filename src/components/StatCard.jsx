import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { T } from '../theme';
import { useHover } from '../hooks';

function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export default function StatCard({ icon, label, value, tint, index = 0 }) {
  const display = useCountUp(value ?? 0);
  const { hovered, bind } = useHover();

  return (
    <motion.div
      {...bind}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        borderRadius: T.radius,
        background: T.surface,
        border: `1px solid ${hovered ? `${tint}70` : T.border}`,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        boxShadow: T.shadow,
        transform: hovered ? 'translateY(-6px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          flex: '0 0 46px',
          borderRadius: 13,
          display: 'grid',
          placeItems: 'center',
          color: tint,
          background: `${tint}26`,
          border: `1px solid ${tint}4d`,
        }}
      >
        <Icon name={icon} size={20} />
      </div>
      <div>
        <span style={{ display: 'block', fontSize: 12.5, color: T.muted, fontWeight: 500 }}>
          {label}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 26,
            fontWeight: 800,
            marginTop: 2,
            letterSpacing: '-0.03em',
          }}
        >
          {value === undefined ? '—' : display.toLocaleString()}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          right: -30,
          top: -30,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: tint,
          filter: 'blur(46px)',
          opacity: 0.22,
          pointerEvents: 'none',
        }}
      />
    </motion.div>
  );
}