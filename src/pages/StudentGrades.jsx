import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, btn, input, chip, gradeStyle } from '../theme';
import { useResponsive, useHover, useCan } from '../hooks';

const EMPTY = { student_id: '', item_id: '', points_earned: '' };
const cell = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.045)', fontSize: 13.5, verticalAlign: 'middle' };
const muted = { color: T.muted, fontSize: 12.5 };

function DeleteBtn({ onClick }) {
  const { hovered, bind } = useHover();
  return (
    <button onClick={onClick} {...bind}
      style={{
        display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 11,
        background: hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${hovered ? 'rgba(248,113,113,0.45)' : T.border}`,
        color: hovered ? T.danger : T.muted, cursor: 'pointer', transition: 'all 0.2s',
      }}
      aria-label="Delete"><Icon name="trash" size={16} /></button>
  );
}

function PrimaryBtn({ children, onClick, type }) {
  const { hovered, bind } = useHover();
  return <button type={type} onClick={onClick} {...bind} style={btn('primary', hovered)}>{children}</button>;
}

function FInput({ label, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
      {label}
      <input {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={input(focus)} />
    </label>
  );
}

export default function StudentGrades() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('student-grades');

  const load = () => api.studentGrades().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    Promise.all([load(), api.students().then(setStudents), api.gradeItems().then(setItems)])
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ student_id: r.student_id || '', item_id: r.item_id || '', points_earned: r.points_earned ?? '' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        student_id: Number(form.student_id),
        item_id: Number(form.item_id),
        points_earned: Number(form.points_earned),
      };
      if (editing) await api.updateStudentGrade(editing.grade_id, payload);
      else await api.createStudentGrade(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this grade?')) return;
    try { await api.deleteStudentGrade(id); setRows(p => p.filter(r => r.grade_id !== id)); }
    catch (err) { setError(err.message); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const labels = ['Student', 'Item', 'Course', 'Score', '%', 'Grade', 'Graded', ''];

  return (
    <Page title="Student Grades" subtitle={`${rows.length} recorded grade${rows.length === 1 ? '' : 's'}`}
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Grade</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          rows.map((r, i) => (
            <motion.div key={r.grade_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ marginBottom: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 4 }}>
              {[
                ['Student', <strong>{r.student_name}</strong>],
                ['Item', r.item_name],
                ['Course', <span style={muted}>{r.course_title || '—'}</span>],
                ['Score', `${r.points_earned} / ${r.max_points}`],
                ['%', <span style={chip(true)}>{r.percentage}%</span>],
                ['Grade', <span style={gradeStyle(r.letter || 'na')}>{r.letter || '—'}</span>],
                ['Graded', <span style={muted}>{fmt(r.graded_at)}</span>],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', gap: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{l}</span>
                  <div style={{ textAlign: 'right' }}>{v}</div>
                </div>
              ))}
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '6px 16px 10px' }}>
                  <EditBtn onClick={() => openEdit(r)} />
                  <DeleteBtn onClick={() => remove(r.grade_id)} />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{labels.map((h, i) => (
              <th key={i} style={{ textAlign: i === 7 ? 'right' : 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.grade_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.35) }}>
                  <td style={cell}><strong>{r.student_name}</strong></td>
                  <td style={cell}>{r.item_name}</td>
                  <td style={cell}><span style={muted}>{r.course_title || '—'}</span></td>
                  <td style={cell}>{r.points_earned} / {r.max_points}</td>
                  <td style={cell}><span style={chip(true)}>{r.percentage}%</span></td>
                  <td style={cell}><span style={gradeStyle(r.letter || 'na')}>{r.letter || '—'}</span></td>
                  <td style={cell}><span style={muted}>{fmt(r.graded_at)}</span></td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <EditBtn onClick={() => openEdit(r)} />
                        <DeleteBtn onClick={() => remove(r.grade_id)} />
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No grades recorded yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Student Grade' : 'Add Student Grade'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Student *
            <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} style={input()}>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Grade item *
            <select required value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })} style={input()}>
              <option value="">Select item…</option>
              {items.map(it => (
                <option key={it.item_id} value={it.item_id}>
                  {it.item_name} (max {it.max_points}) — {it.class_name || ''} {it.course_title || ''}
                </option>
              ))}
            </select>
          </label>
          <FInput label="Points earned *" required type="number" step="0.01" min="0"
            value={form.points_earned}
            onChange={e => setForm({ ...form, points_earned: e.target.value })}
            placeholder="28" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
            <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}