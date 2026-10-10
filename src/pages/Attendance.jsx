import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, btn, input, gradeStyle } from '../theme';
import { useResponsive, useHover, useCan } from '../hooks';

const STATUS = ['Present', 'Absent', 'Late', 'Excused'];
const STATUS_CLASS = { Present: 'A', Absent: 'F', Late: 'C', Excused: 'B' };
const EMPTY = { student_id: '', subject_id: '', attendance_date: '', status: 'Present', remarks: '' };
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

export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('attendance');

  const load = () => api.attendance().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    Promise.all([load(), api.students().then(setStudents), api.classSubjects().then(setSubjects)])
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      student_id: r.student_id || '',
      subject_id: r.subject_id || '',
      attendance_date: r.attendance_date ? String(r.attendance_date).slice(0, 10) : '',
      status: r.status || 'Present',
      remarks: r.remarks || '',
    });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        student_id: Number(form.student_id),
        subject_id: Number(form.subject_id),
        attendance_date: form.attendance_date,
        status: form.status,
        remarks: form.remarks || null,
      };
      if (editing) await api.updateAttendance(editing.attendance_id, payload);
      else await api.createAttendance(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try { await api.deleteAttendance(id); setRows(p => p.filter(r => r.attendance_id !== id)); }
    catch (err) { setError(err.message); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const labels = ['Student', 'Class / Course', 'Date', 'Status', 'Remarks', ''];

  return (
    <Page title="Attendance" subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Mark Attendance</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          rows.map((r, i) => (
            <motion.div key={r.attendance_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ marginBottom: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 4 }}>
              {[
                ['Student', <strong>{r.student_name}</strong>],
                ['Class / Course', <span style={muted}>{r.class_name || '—'} · {r.course_title || '—'}</span>],
                ['Date', <span style={muted}>{fmt(r.attendance_date)}</span>],
                ['Status', <span style={gradeStyle(STATUS_CLASS[r.status] || 'na')}>{r.status}</span>],
                ['Remarks', <span style={muted}>{r.remarks || '—'}</span>],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', gap: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{l}</span>
                  <div style={{ textAlign: 'right' }}>{v}</div>
                </div>
              ))}
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '6px 16px 10px' }}>
                  <EditBtn onClick={() => openEdit(r)} />
                  <DeleteBtn onClick={() => remove(r.attendance_id)} />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{labels.map((h, i) => (
              <th key={i} style={{ textAlign: i === 5 ? 'right' : 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.attendance_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.35) }}>
                  <td style={cell}><strong>{r.student_name}</strong></td>
                  <td style={cell}><span style={muted}>{r.class_name || '—'} · {r.course_title || '—'}</span></td>
                  <td style={cell}><span style={muted}>{fmt(r.attendance_date)}</span></td>
                  <td style={cell}><span style={gradeStyle(STATUS_CLASS[r.status] || 'na')}>{r.status}</span></td>
                  <td style={cell}><span style={muted}>{r.remarks || '—'}</span></td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <EditBtn onClick={() => openEdit(r)} />
                        <DeleteBtn onClick={() => remove(r.attendance_id)} />
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No attendance records yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Attendance' : 'Mark Attendance'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Student *
            <select required value={form.student_id} onChange={e => setForm({ ...form, student_id: e.target.value })} style={input()}>
              <option value="">Select student…</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Subject *
            <select required value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} style={input()}>
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.class_name} — {s.course_title}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Date *
              <input required type="date" value={form.attendance_date} onChange={e => setForm({ ...form, attendance_date: e.target.value })} style={input()} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Status *
              <select required value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input()}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Remarks
            <input value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} style={input()} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
            <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}