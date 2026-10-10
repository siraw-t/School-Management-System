export default function GlobalStyles() {
  return (
    <style>{`
      *, *::before, *::after { box-sizing: border-box; }
      html, body, #root { min-height: 100%; margin: 0; }
      body {
        background: #070b16;
        color: #e9edf7;
        font-family: Inter, system-ui, -apple-system, 'Segoe UI', sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      a { color: inherit; text-decoration: none; }
      input, select, textarea, button { font: inherit; color: inherit; }
      h1, h2, h3 { margin: 0; letter-spacing: -0.02em; }
      select option { background: #0e1425; }

      @keyframes drift1 { 50% { transform: translate(130px, 90px) scale(1.15); } }
      @keyframes drift2 { 50% { transform: translate(-150px, -80px) scale(1.1); } }
      @keyframes drift3 { 50% { transform: translate(-100px, 120px) scale(0.88); } }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); }
        70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
        100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
      }
      @keyframes shimmer {
        0% { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
      @keyframes floatIn {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}