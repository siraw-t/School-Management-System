export const T = {
  bg: '#070b16',
  surface: 'rgba(255,255,255,0.045)',
  surfaceHover: 'rgba(255,255,255,0.075)',
  border: 'rgba(255,255,255,0.09)',
  text: '#e9edf7',
  muted: '#8a94ad',
  accent: '#7c5cff',
  accent2: '#22d3ee',
  success: '#34d399',
  danger: '#f87171',
  radius: 16,
  shadow: '0 20px 45px -22px rgba(0,0,0,0.9)',
};

export const card = (hovered) => ({
  background: T.surface,
  border: `1px solid ${hovered ? 'rgba(124,92,255,0.45)' : T.border}`,
  borderRadius: T.radius,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: hovered
    ? '0 26px 50px -24px rgba(124,92,255,0.55)'
    : T.shadow,
  transition: 'transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
  transform: hovered ? 'translateY(-6px)' : 'none',
});

export const btn = (variant = 'ghost', hovered = false) => {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 12,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'transform 0.18s, box-shadow 0.22s, background 0.22s',
    fontFamily: 'inherit',
  };
  if (variant === 'primary') {
    return {
      ...base,
      color: '#fff',
      background: 'linear-gradient(135deg, #7c5cff, #5b8cff)',
      boxShadow: hovered
        ? '0 18px 38px -14px #7c5cff'
        : '0 14px 30px -14px #7c5cff',
      transform: hovered ? 'translateY(-2px)' : 'none',
    };
  }
  return {
    ...base,
    color: T.text,
    background: hovered ? T.surfaceHover : T.surface,
    border: `1px solid ${T.border}`,
  };
};

export const iconBtn = (danger = false, hovered = false) => ({
  display: 'grid',
  placeItems: 'center',
  width: 38,
  height: 38,
  borderRadius: 11,
  background: hovered ? T.surfaceHover : T.surface,
  border: `1px solid ${danger && hovered ? 'rgba(248,113,113,0.45)' : T.border}`,
  color: danger && hovered ? T.danger : hovered ? T.text : T.muted,
  cursor: 'pointer',
  transition: 'all 0.2s',
});

export const input = (focused = false) => ({
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${focused ? 'rgba(124,92,255,0.55)' : T.border}`,
  outline: 'none',
  fontSize: 13.5,
  color: T.text,
  boxShadow: focused ? '0 0 0 4px rgba(124,92,255,0.13)' : 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
});

export const chip = (subtle = false) => ({
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 600,
  background: subtle ? 'rgba(255,255,255,0.075)' : 'rgba(124,92,255,0.16)',
  border: `1px solid ${subtle ? T.border : 'rgba(124,92,255,0.3)'}`,
  color: subtle ? T.muted : '#c4b5fd',
});

export const gradeStyle = (g = 'na') => {
  const grade = String(g || '').trim();
  const map = {
    'A+': ['rgba(52,211,153,0.20)', 'rgba(52,211,153,0.45)', '#6ee7b7'],
    'A':  ['rgba(52,211,153,0.15)', 'rgba(52,211,153,0.35)', '#6ee7b7'],
    'A-': ['rgba(52,211,153,0.12)', 'rgba(52,211,153,0.30)', '#6ee7b7'],
    'B+': ['rgba(34,211,238,0.18)', 'rgba(34,211,238,0.38)', '#67e8f9'],
    'B':  ['rgba(34,211,238,0.15)', 'rgba(34,211,238,0.35)', '#67e8f9'],
    'B-': ['rgba(34,211,238,0.12)', 'rgba(34,211,238,0.30)', '#67e8f9'],
    'C':  ['rgba(251,191,36,0.15)', 'rgba(251,191,36,0.35)', '#fcd34d'],
    'D':  ['rgba(251,146,60,0.15)', 'rgba(251,146,60,0.35)', '#fdba74'],
    'F':  ['rgba(248,113,113,0.15)', 'rgba(248,113,113,0.35)', '#fca5a5'],
  };
  const [bg, bd, cl] = map[grade] || ['rgba(255,255,255,0.075)', T.border, T.muted];
  return {
    display: 'inline-grid',
    placeItems: 'center',
    minWidth: 34,
    padding: '4px 9px',
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 700,
    background: bg,
    border: `1px solid ${bd}`,
    color: cl,
  };
};

export const gridCols = (isMobile, isTablet, cols = 4) => {
  if (isMobile) return '1fr';
  if (isTablet && cols > 2) return 'repeat(2, 1fr)';
  return `repeat(${cols}, 1fr)`;
};