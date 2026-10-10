import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import { api } from '../api';
import { T, gridCols, gradeStyle, chip } from '../theme';
import { useResponsive } from '../hooks';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    Promise.all([api.stats(), api.courses(), api.enrollments()])
      .then(([s, c, e]) => {
        setStats(s);
        setCourses(c);
        setEnrollments(e.slice(0, 6));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const top = [...courses].sort((a, b) => b.enrolled - a.enrolled).slice(0, 5);
  const max = Math.max(...top.map((c) => c.enrolled), 1);

  const panel = {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: T.radius,
    padding: 22,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: T.shadow,
  };

  return (
    <Page title="Dashboard" subtitle="A quick look at your school at a glance.">
      {error && (
        <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridCols(isMobile, isTablet, 4), gap: 18, marginBottom: 26 }}>
        <StatCard index={0} icon="users" label="Students" value={stats?.students} tint="#7c5cff" />
        <StatCard index={1} icon="teacher" label="Teachers" value={stats?.teachers} tint="#22d3ee" />
        <StatCard index={2} icon="book" label="Courses" value={stats?.courses} tint="#f472b6" />
        <StatCard index={3} icon="clipboard" label="Enrollments" value={stats?.enrollments} tint="#34d399" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.15fr 1fr', gap: 20 }}>
        <motion.section style={panel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.45 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Most Popular Courses</h2>
            <span style={chip()}>{courses.length} total</span>
          </div>

          {loading ? <Skeleton rows={4} /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {top.map((c, i) => (
                <motion.li key={c.course_id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.07, duration: 0.4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600 }}>{c.title}</span>
                    <span style={{ color: T.muted }}>{c.enrolled}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.enrolled / max) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: '100%', borderRadius: 8, background: 'linear-gradient(90deg, #7c5cff, #22d3ee)', boxShadow: '0 0 14px -2px #7c5cff' }}
                    />
                  </div>
                </motion.li>
              ))}
              {top.length === 0 && <li style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No courses yet.</li>}
            </ul>
          )}
        </motion.section>

        <motion.section style={panel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.45 }}>
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Recent Enrollments</h2>
          </div>

          {loading ? <Skeleton rows={4} /> : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {enrollments.map((e, i) => (
                <motion.li key={e.enrollment_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 + i * 0.06, duration: 0.35 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i === enrollments.length - 1 ? 'none' : `1px solid ${T.border}` }}>
                  <Avatar name={e.student_name} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 13.5, display: 'block' }}>{e.student_name}</strong>
                    <span style={{ fontSize: 12.5, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      enrolled in {e.course_title}
                    </span>
                  </div>
                  <span style={gradeStyle(e.grade || 'na')}>{e.grade || '—'}</span>
                </motion.li>
              ))}
              {enrollments.length === 0 && <li style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No enrollments yet.</li>}
            </ul>
          )}
        </motion.section>
      </div>
    </Page>
  );
}