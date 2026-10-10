import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, btn, input, chip } from '../theme';
import { useResponsive, useHover, useCan } from '../hooks';

const EMPTY = { class_id: '', course_id: '', teacher_id: '' };
const cell = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.045)', fontSize: 13.5, verticalAlign: 'middle' };

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

export default function ClassSubjects() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('class-subjects');

  const load = () => api.classSubjects().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    const tasks = [load()];
    if (canEdit) {
      tasks.push(api.classes().then(setClasses));
      tasks.push(api.courses().then(setCourses));
      tasks.push(api.teachers().then(setTeachers));
    }
    Promise.all(tasks).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ class_id: r.class_id || '', course_id: r.course_id || '', teacher_id: r.teacher_id || '' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        class_id: Number(form.class_id),
        course_id: Number(form.course_id),
        teacher_id: Number(form.teacher_id),
      };
      if (editing) await api.updateClassSubject(editing.subject_id, payload);
      else await api.createClassSubject(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this class subject?')) return;
    try { await api.deleteClassSubject(id); setRows(p => p.filter(r => r.subject_id !== id)); }
    catch (err) { setError(err.message); }
  };

  const labels = ['Class', 'Course', 'Teacher', 'Credits', ''];

  return (
    <Page
      title="Class Subjects"
      subtitle={
        canEdit
          ? `${rows.length} assignment${rows.length === 1 ? '' : 's'}`
          : `Your subject${rows.length === 1 ? '' : 's'}`
      }
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Assign Subject</PrimaryBtn> : null}
    >
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          rows.map((r, i) => (
            <motion.div key={r.subject_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ marginBottom: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 4 }}>
              {[
                ['Class', <strong>{r.class_name}</strong>],
                ['Course', r.course_title],
                ['Teacher', r.teacher_name],
                ['Credits', <span style={chip(true)}>{r.credits}</span>],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', gap: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{l}</span>
                  <div style={{ textAlign: 'right' }}>{v}</div>
                </div>
              ))}
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '6px 16px 10px' }}>
                  <EditBtn onClick={() => openEdit(r)} />
                  <DeleteBtn onClick={() => remove(r.subject_id)} />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{labels.map((h, i) => (
              <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={r.subject_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.035, 0.4) }}>
                  <td style={cell}><strong>{r.class_name}</strong></td>
                  <td style={cell}>{r.course_title}</td>
                  <td style={cell}>{r.teacher_name}</td>
                  <td style={cell}><span style={chip(true)}>{r.credits}</span></td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <EditBtn onClick={() => openEdit(r)} />
                        <DeleteBtn onClick={() => remove(r.subject_id)} />
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No subjects to show.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && (
        <Modal open={open} onClose={closeModal} title={editing ? 'Edit Class Subject' : 'Assign Subject'}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Class *
              <select required value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} style={input()}>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Course *
              <select required value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })} style={input()}>
                <option value="">Select course…</option>
                {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Teacher *
              <select required value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })} style={input()}>
                <option value="">Select teacher…</option>
                {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
              <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Assign'}</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}