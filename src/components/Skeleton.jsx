export default function Skeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 46,
            borderRadius: 12,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 37%, rgba(255,255,255,0.04) 63%)',
            backgroundSize: '400% 100%',
            animation: 'shimmer 1.4s ease infinite',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}