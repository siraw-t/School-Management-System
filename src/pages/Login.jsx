import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { T, btn, input } from '../theme';
import { useHover } from '../hooks';
import Icon from '../components/Icon';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [focus, setFocus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { hovered, bind } = useHover();
  const [remember, setRemember] = useState(false);

const submit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
    const data = await api.login(form);
    login(data, remember);   // ← pass remember flag
    navigate(location.state?.from?.pathname || '/', { replace: true });
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <span style={orb('#7c5cff', '-180px', 'auto', '-140px', 'auto', 'drift1 22s ease-in-out infinite')} />
        <span style={orb('#22d3ee', 'auto', '-170px', 'auto', '-130px', 'drift2 26s ease-in-out infinite')} />
        <span style={orb('#f472b6', '42%', 'auto', '58%', 'auto', 'drift3 30s ease-in-out infinite')} />
      </div>

      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20, position: 'relative', zIndex: 1 }}>
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%', maxWidth: 420, padding: 34,
            background: 'rgba(11,16,30,0.75)',
            border: `1px solid ${T.border}`,
            borderRadius: 22,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 26 }}>
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 15 }}
              style={{
                width: 62, height: 62, borderRadius: 18,
                display: 'grid', placeItems: 'center',
                fontWeight: 800, fontSize: 26, color: '#fff',
                background: 'linear-gradient(135deg, #7c5cff, #22d3ee)',
                boxShadow: '0 16px 34px -12px #7c5cff',
              }}
            >E</motion.div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Welcome back</h1>
            <p style={{ color: T.muted, fontSize: 13.5, margin: 0 }}>Sign in to EduPanel</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '11px 14px', marginBottom: 16, borderRadius: 12, fontSize: 12.5,
                background: 'rgba(248,113,113,0.12)',
                border: '1px solid rgba(248,113,113,0.32)',
                color: '#fca5a5',
              }}
            >{error}</motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Username
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...input(focus === 'u'), padding: '0 14px' }}>
                <Icon name="users" size={15} />
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  onFocus={() => setFocus('u')}
                  onBlur={() => setFocus('')}
                  placeholder="admin"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '11px 0', fontSize: 13.5, color: T.text }}
                />
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Password
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...input(focus === 'p'), padding: '0 14px' }}>
                <Icon name="lock" size={15} />
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocus('p')}
                  onBlur={() => setFocus('')}
                  placeholder="••••••••"
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '11px 0', fontSize: 13.5, color: T.text }}
                />
              </div>
            </label>
          </div>
<label style={{
  display: 'flex', alignItems: 'center', gap: 8,
  marginTop: 14, fontSize: 12.5, color: T.muted, cursor: 'pointer',
}}>
  <input
    type="checkbox"
    checked={remember}
    onChange={(e) => setRemember(e.target.checked)}
    style={{ width: 16, height: 16, accentColor: T.accent, cursor: 'pointer' }}
  />
  Keep me signed in for 7 days
</label>
          <motion.button
            type="submit"
            disabled={loading}
            {...bind}
            whileHover={!loading ? { y: -2 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%', marginTop: 22, padding: '12px 18px',
              borderRadius: 12, border: 'none',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: 700, fontSize: 14, color: '#fff',
              background: 'linear-gradient(135deg, #7c5cff, #5b8cff)',
              boxShadow: hovered ? '0 18px 38px -14px #7c5cff' : '0 14px 30px -14px #7c5cff',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
          >{loading ? 'Signing in…' : 'Sign in'}</motion.button>

          <p style={{ marginTop: 18, fontSize: 12, color: T.muted, textAlign: 'center' }}>
            Use your assigned username and password
          </p>
        </motion.form>
      </div>
    </>
  );
}

function orb(color, top, bottom, left, right, animation) {
  return {
    position: 'absolute', width: 480, height: 480, borderRadius: '50%',
    background: color, filter: 'blur(100px)', opacity: 0.28,
    top, bottom, left, right, animation,
  };
}