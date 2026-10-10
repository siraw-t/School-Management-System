import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import GlobalStyles from './GlobalStyles';
import { T, iconBtn } from '../theme';
import { useResponsive, useHover } from '../hooks';
import { useAuth } from '../context/AuthContext';
import { canSeeNav } from '../permissions';

const NAV = [
  { to: '/',                label: 'Dashboard',      icon: 'dashboard', end: true },
  { to: '/students',        label: 'Students',       icon: 'users' },
  { to: '/teachers',        label: 'Teachers',       icon: 'teacher' },
  { to: '/courses',         label: 'Courses',        icon: 'book' },
  { to: '/classes',         label: 'Classes',        icon: 'clipboard' },
  { to: '/class-subjects',  label: 'Class Subjects', icon: 'book' },
  { to: '/enrollments',     label: 'Enrollments',    icon: 'clipboard' },
  { to: '/attendance',      label: 'Attendance',     icon: 'calendar' },
  { to: '/grade-items',     label: 'Grade Items',    icon: 'award' },
  { to: '/student-grades',  label: 'Student Grades', icon: 'award' },
  { to: '/cgpa', label: 'CGPA', icon: 'award' },
  { to: '/academic-years',  label: 'Academic Years', icon: 'dashboard' },
  { to: '/users',           label: 'Users',          icon: 'lock' },
  { to: '/roles',           label: 'Roles',          icon: 'users' },
  { to: '/reports', label: 'Reports', icon: 'clipboard' },
];

function NavItem({ item, index, active }) {
  const { hovered, bind } = useHover();
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.04 * index, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <NavLink
        to={item.to}
        end={item.end}
        {...bind}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 14px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          color: active ? '#fff' : hovered ? T.text : T.muted,
          background: active
            ? 'linear-gradient(90deg, rgba(124,92,255,0.22), rgba(34,211,238,0.08))'
            : hovered ? T.surface : 'transparent',
          transform: hovered && !active ? 'translateX(3px)' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        {active && (
          <span
            style={{
              position: 'absolute', left: 0, top: '22%', bottom: '22%',
              width: 3, borderRadius: 3,
              background: 'linear-gradient(180deg, #7c5cff, #22d3ee)',
            }}
          />
        )}
        <Icon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    </motion.div>
  );
}

function HoverIconBtn({ onClick, name, danger }) {
  const { hovered, bind } = useHover();
  return (
    <button onClick={onClick} style={iconBtn(danger, hovered)} {...bind} aria-label={name}>
      <Icon name={name} />
    </button>
  );
}

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { isSidebarCollapsed } = useResponsive();
  const { user, logout } = useAuth();

  const visibleNav = NAV.filter((item) => canSeeNav(user?.role, item.to));

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <GlobalStyles />

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <span style={orbStyle('520px', '#7c5cff', '-180px', 'auto', '-140px', 'auto', 'drift1 22s ease-in-out infinite')} />
        <span style={orbStyle('460px', '#22d3ee', 'auto', '-170px', 'auto', '-130px', 'drift2 26s ease-in-out infinite')} />
        <span style={orbStyle('380px', '#f472b6', '42%', 'auto', '58%', 'auto', 'drift3 30s ease-in-out infinite')} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh' }}>
        <AnimatePresence>
          {open && isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 65,
                background: 'rgba(4,7,15,0.65)',
                backdropFilter: 'blur(4px)',
              }}
            />
          )}
        </AnimatePresence>

        <aside
          style={{
            width: 254, flex: '0 0 254px',
            display: 'flex', flexDirection: 'column', gap: 8,
            padding: '22px 16px',
            background: 'rgba(11,16,30,0.72)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            borderRight: `1px solid ${T.border}`,
            position: isSidebarCollapsed ? 'fixed' : 'sticky',
            top: 0, left: 0, height: '100vh', zIndex: 70,
            transform: isSidebarCollapsed && !open ? 'translateX(-102%)' : 'translateX(0)',
            transition: 'transform 0.38s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: isSidebarCollapsed && open ? '0 0 60px rgba(0,0,0,0.6)' : 'none',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px 20px' }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              display: 'grid', placeItems: 'center',
              fontWeight: 800, fontSize: 18, color: '#fff',
              background: 'linear-gradient(135deg, #7c5cff, #22d3ee)',
              boxShadow: '0 10px 26px -10px #7c5cff',
            }}>E</div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: 'block', fontSize: 15 }}>EduPanel</strong>
              <span style={{ display: 'block', fontSize: 11.5, color: T.muted }}>School Manager</span>
            </div>
            {isSidebarCollapsed && <HoverIconBtn onClick={() => setOpen(false)} name="close" />}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1 }}>
            {visibleNav.map((item, i) => (
              <NavItem
                key={item.to}
                item={item}
                index={i}
                active={item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)}
              />
            ))}
          </nav>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 8px', borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 6px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                display: 'grid', placeItems: 'center',
                background: 'linear-gradient(135deg, #7c5cff, #22d3ee)',
                color: '#fff', fontWeight: 700, fontSize: 13,
              }}>
                {(user?.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.username}
                </strong>
                <span style={{ fontSize: 11, color: T.muted, display: 'block' }}>{user?.role || 'user'}</span>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: T.surface, border: `1px solid ${T.border}`,
                color: T.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = T.danger;
                e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = T.muted;
                e.currentTarget.style.borderColor = T.border;
              }}
            >
              <Icon name="logout" size={16} /> Sign out
            </button>
          </div>
        </aside>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {isSidebarCollapsed && (
            <header style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '14px 18px',
              position: 'sticky', top: 0, zIndex: 40,
              background: 'rgba(9,13,25,0.82)',
              backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              borderBottom: `1px solid ${T.border}`,
            }}>
              <HoverIconBtn onClick={() => setOpen(true)} name="menu" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>EduPanel</span>
              <span style={{ width: 38 }} />
            </header>
          )}

          <main style={{
            padding: isSidebarCollapsed ? '22px 18px 70px' : '34px 38px 70px',
            maxWidth: 1280, width: '100%', boxSizing: 'border-box',
          }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

function orbStyle(size, color, top, bottom, left, right, animation) {
  return {
    position: 'absolute', width: size, height: size, borderRadius: '50%',
    background: color, filter: 'blur(100px)', opacity: 0.28,
    top, bottom, left, right, animation,
  };
}