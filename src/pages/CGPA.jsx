import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import { api } from '../api';
import { T, chip, gradeStyle } from '../theme';
import { useResponsive, useHover } from '../hooks';
import { useAuth } from '../context/AuthContext';

const cell = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.045)', fontSize: 13.5, verticalAlign: 'middle' };

function cgpaColor(cgpa) {
  if (cgpa === null || cgpa === undefined) return '#8a94ad';
  if (cgpa >= 3.75) return '#6ee7b7';
  if (cgpa >= 3.50) return '#67e8f9';
  if (cgpa >= 3.00) return '#a5b4fc';
  if (cgpa >= 2.00) return '#fcd34d';
  if (cgpa >= 1.00) return '#fdba74';
  return '#fca5a5';
}

function cgpaLabel(cgpa) {
  if (cgpa === null || cgpa === undefined) return '—';
  if (cgpa >= 3.75) return 'Summa Cum Laude';
  if (cgpa >= 3.50) return 'Magna Cum Laude';
  if (cgpa >= 3.00) return 'Cum Laude';
  if (cgpa >= 2.00) return 'Satisfactory';
  if (cgpa >= 1.00) return 'On Probation';
  return 'At Risk';
}

function StudentRow({ r, rank, onClick }) {
  const { hovered, bind } = useHover();
  const color = cgpaColor(r.cgpa);
  return (
    <motion.tr
      {...bind}
      onClick={onClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(rank * 0.03, 0.35) }}
      style={{
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.032)' : 'transparent',
        transition: 'background 0.2s',
      }}
    >
      <td style={{ ...cell, width: 60 }}>
        {rank === 1 ? <span style={{ fontSize: 18 }}>🥇</span>
         : rank === 2 ? <span style={{ fontSize: 18 }}>🥈</span>
         : rank === 3 ? <span style={{ fontSize: 18 }}>🥉</span>
         : <span style={{ color: T.muted, fontWeight: 600 }}>{rank}</span>}
      </td>
      <td style={cell}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={r.name} size={36} />
          <div>
            <strong>{r.name}</strong>
            <span style={{ display: 'block', color: T.muted, fontSize: 12.5 }}>{r.email}</span>
          </div>
        </div>
      </td>
      <td style={cell}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color }}>
            {r.cgpa === null ? '—' : r.cgpa.toFixed(2)}
          </span>
          <span style={{ fontSize: 12, color: T.muted }}>/ 4.00</span>
        </div>
        <span style={{ display: 'block', fontSize: 11.5, color, marginTop: 2 }}>
          {cgpaLabel(r.cgpa)}
        </span>
      </td>
      <td style={cell}>
        <span style={{ fontWeight: 600 }}>{r.total_credits}</span>
        <span style={{ color: T.muted, fontSize: 12 }}> cr</span>
      </td>
      <td style={cell}>
        <span style={{ fontWeight: 600 }}>{Number(r.quality_points).toFixed(1)}</span>
        <span style={{ color: T.muted, fontSize: 12 }}> pts</span>
      </td>
      <td style={cell}>
        <span style={chip()}>{r.courses_graded} / {r.courses_total}</span>
      </td>
      <td style={{ ...cell, textAlign: 'right' }}>
        <Icon name="award" size={16} />
      </td>
    </motion.tr>
  );
}

function SummaryCard({ icon, label, value, tint, index = 0 }) {
  const { hovered, bind } = useHover();
  return (
    <motion.div
      {...bind}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', gap: 16, padding: 20,
        borderRadius: T.radius, background: T.surface,
        border: `1px solid ${hovered ? `${tint}70` : T.border}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        boxShadow: T.shadow,
        transform: hovered ? 'translateY(-6px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{
        width: 46, height: 46, flex: '0 0 46px', borderRadius: 13,
        display: 'grid', placeItems: 'center', color: tint,
        background: `${tint}26`, border: `1px solid ${tint}4d`,
      }}><Icon name={icon} size={20} /></div>
      <div>
        <span style={{ display: 'block', fontSize: 12.5, color: T.muted, fontWeight: 500 }}>{label}</span>
        <span style={{ display: 'block', fontSize: 26, fontWeight: 800, marginTop: 2, letterSpacing: '-0.03em' }}>
          {value}
        </span>
      </div>
      <div style={{
        position: 'absolute', right: -30, top: -30, width: 110, height: 110,
        borderRadius: '50%', background: tint, filter: 'blur(46px)',
        opacity: 0.22, pointerEvents: 'none',
      }} />
    </motion.div>
  );
}

export default function CGPA() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { isMobile } = useResponsive();
  const { user } = useAuth();

  useEffect(() => {
    api.cgpa()
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const openDetail = async (s) => {
    setSelected(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await api.studentCGPA(s.student_id);
      setDetail(d);
    } catch (e) { setError(e.message); }
    finally { setDetailLoading(false); }
  };
  const closeDetail = () => { setSelected(null); setDetail(null); };

  const sorted = [...rows].sort((a, b) => {
    const ac = a.cgpa ?? -1, bc = b.cgpa ?? -1;
    return bc - ac;
  });

  const graded = rows.filter(r => r.cgpa !== null);
  const avg = graded.length
    ? Number((graded.reduce((s, r) => s + r.cgpa, 0) / graded.length).toFixed(2))
    : null;
  const best = graded.length ? Math.max(...graded.map(r => r.cgpa)) : null;
  const totalCredits = graded.reduce((s, r) => s + r.total_credits, 0);

  return (
    <Page title="CGPA" subtitle={
      user?.role === 'Student'
        ? 'Your cumulative grade point average.'
        : 'Cumulative grade point average across all students.'
    }>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
        gap: 18, marginBottom: 26,
      }}>
        <SummaryCard index={0} icon="users"  label="Students"        value={graded.length}                          tint="#7c5cff" />
        <SummaryCard index={1} icon="award"  label="Average CGPA"    value={avg === null ? '—' : avg.toFixed(2)}   tint="#22d3ee" />
        <SummaryCard index={2} icon="star"   label="Highest CGPA"    value={best === null ? '—' : best.toFixed(2)} tint="#34d399" />
        <SummaryCard index={3} icon="book"   label="Credits Awarded" value={totalCredits}                           tint="#f472b6" />
      </div>

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          sorted.map((r, i) => (
            <motion.div key={r.student_id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              onClick={() => openDetail(r)}
              style={{
                marginBottom: 14, background: T.surface, padding: 4,
                border: `1px solid ${T.border}`, borderRadius: 16, cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                <Avatar name={r.name} size={36} />
                <div style={{ flex: 1 }}>
                  <strong>{r.name}</strong>
                  <span style={{ display: 'block', color: T.muted, fontSize: 12.5 }}>{r.email}</span>
                </div>
                <span style={{
                  fontSize: 22, fontWeight: 800, color: cgpaColor(r.cgpa),
                }}>{r.cgpa === null ? '—' : r.cgpa.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px 10px', fontSize: 12, color: T.muted }}>
                <span>{r.total_credits} cr · {Number(r.quality_points).toFixed(1)} pts</span>
                <span>{r.courses_graded}/{r.courses_total} courses</span>
              </div>
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#', 'Student', 'CGPA', 'Credits', 'Quality Pts', 'Graded', ''].map((h, i) => (
                  <th key={i} style={{
                    textAlign: i === 6 ? 'right' : 'left',
                    fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: T.muted,
                    padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <StudentRow key={r.student_id} r={r} rank={i + 1} onClick={() => openDetail(r)} />
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No students yet.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={closeDetail}
        title={selected ? `${selected.name} — CGPA Breakdown` : ''}
      >
        {detailLoading && <Skeleton rows={3} />}

        {detail && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 20,
              padding: 18, marginBottom: 16,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${T.border}`,
              borderRadius: 14,
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 40, fontWeight: 800, lineHeight: 1,
                  color: cgpaColor(detail.cgpa), letterSpacing: '-0.04em',
                }}>
                  {detail.cgpa === null ? '—' : detail.cgpa.toFixed(2)}
                </div>
                <div style={{ fontSize: 11.5, color: T.muted, marginTop: 4 }}>CGPA / 4.00</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: cgpaColor(detail.cgpa) }}>
                  {cgpaLabel(detail.cgpa)}
                </div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 4 }}>
                  {detail.total_credits} credits · {detail.quality_points.toFixed(1)} quality points
                </div>
              </div>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Course', 'Cr', 'Grade', 'Pts', 'Q.Pts'].map((h, i) => (
                      <th key={i} style={{
                        textAlign: i === 0 ? 'left' : 'right',
                        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.06em', color: T.muted,
                        padding: '10px 12px', borderBottom: `1px solid ${T.border}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detail.courses.map(c => (
                    <tr key={c.enrollment_id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.045)' }}>
                        {c.course_title}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.045)', textAlign: 'right', color: T.muted }}>
                        {c.credits}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.045)', textAlign: 'right' }}>
                        {c.grade
                          ? <span style={gradeStyle(c.grade)}>{c.grade}</span>
                          : <span style={{ color: T.muted, fontSize: 12 }}>In progress</span>}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.045)', textAlign: 'right', color: T.muted }}>
                        {c.grade_points ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.045)', textAlign: 'right', fontWeight: 600 }}>
                        {c.quality_points ? Number(c.quality_points).toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                  {detail.courses.length === 0 && (
                    <tr><td colSpan="5" style={{ textAlign: 'center', color: T.muted, padding: 20 }}>No enrollments yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </Page>
  );
}