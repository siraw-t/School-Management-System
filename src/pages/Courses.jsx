import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, card, btn, input, chip } from '../theme';
import { useResponsive, useHover, useCan } from '../hooks';

const EMPTY = { title: '', credits: '', teacher_id: '' };

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

function CourseCard({ c, i, max, onEdit, onDelete, canEdit }) {
  const { hovered, bind } = useHover();
  return (
    <motion.article
      {...bind}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...card(hovered), padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          background: 'rgba(34,211,238,0.14)', border: '1px solid rgba(34,211,238,0.3)', color: '#67e8f9',
        }}>{c.credits} cr</span>
        <span style={chip(true)}>#{c.course_id}</span>
      </div>
      <h3 style={{ fontSize: 16.5, lineHeight: 1.35 }}>{c.title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: T.muted }}>{c.teacher_name || 'Unassigned'}</p>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(c.enrolled / max) * 100}%` }}
            transition={{ delay: 0.2 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ height: '100%', borderRadius: 7, background: 'linear-gradient(90deg, #7c5cff, #22d3ee)' }}
          />
        </div>
        <span style={{ fontSize: 12, color: T.muted }}>{c.enrolled} enrolled</span>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <EditBtn onClick={() => onEdit(c)} />
          <DeleteBtn onClick={() => onDelete(c.course_id)} />
        </div>
      )}
    </motion.article>
  );
}

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('courses');

  const load = () => api.courses().then(setCourses).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); api.teachers().then(setTeachers).catch(() => {}); }, []);

  const max = Math.max(...courses.map(c => c.enrolled), 1);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ title: c.title || '', credits: c.credits ?? '', teacher_id: c.teacher_id || '' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        title: form.title,
        credits: form.credits ? Number(form.credits) : null,
        teacher_id: form.teacher_id ? Number(form.teacher_id) : null,
      };
      if (editing) await api.updateCourse(editing.course_id, payload);
      else await api.createCourse(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try { await api.deleteCourse(id); setCourses(p => p.filter(c => c.course_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Courses" subtitle="Every course offered this term."
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Course</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {courses.map((c, i) => <CourseCard key={c.course_id} c={c} i={i} max={max} onEdit={openEdit} onDelete={remove} canEdit={canEdit} />)}
          {courses.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No courses yet.</p>}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Course' : 'Add Course'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <FInput label="Title *" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <FInput label="Credits" type="number" min="1" value={form.credits} onChange={e => setForm({ ...form, credits: e.target.value })} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Teacher
            <select value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })} style={input()}>
              <option value="">Unassigned</option>
              {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>)}
            </select>
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