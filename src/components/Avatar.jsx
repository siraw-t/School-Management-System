const PALETTE = ['#7c5cff', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#60a5fa'];

export default function Avatar({ name = '?', size = 42 }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join('').toUpperCase();
  const color = PALETTE[(name.charCodeAt(0) || 0) % PALETTE.length];

  return (
    <span
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        flex: 'none',
        borderRadius: 12,
        border: `1px solid ${color}55`,
        background: `${color}26`,
        color,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      {initials || '?'}
    </span>
  );
}