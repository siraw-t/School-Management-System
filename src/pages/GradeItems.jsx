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

const ITEMS = [
  { name: 'Assignment', points: 30 },
  { name: 'Mid Exam',   points: 30 },
  { name: 'Final Exam', points: 40 },
];

const EMPTY = { subject_id: '', item_name: '' };

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

function GradeItemCard({ r, i, onEdit, onDelete, canEdit }) {
  const { hovered, bind } = useHover();
  return (
    <motion.article
      {...bind}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06 }}
      style={{ ...card(hovered), padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          background: 'rgba(34,211,238,0.14)', border: '1px solid rgba(34,211,238,0.3)', color: '#67e8f9',
        }}>{r.max_points} pts</span>
        <span style={chip(true)}>#{r.item_id}</span>
      </div>
      <h3 style={{ fontSize: 16.5, lineHeight: 1.35 }}>{r.item_name}</h3>
      <p style={{ margin: 0, fontSize: 13, color: T.muted }}>
        {r.class_name || '—'} · {r.course_title || '—'}
      </p>
      <span style={{ fontSize: 12, color: T.muted, marginTop: 'auto' }}>
        {r.grades_count} grade{r.grades_count === 1 ? '' : 's'} recorded
      </span>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <EditBtn onClick={() => onEdit(r)} />
          <DeleteBtn onClick={() => onDelete(r.item_id)} />
        </div>
      )}
    </motion.article>
  );
}

export default function GradeItems() {
  const [rows, setRows] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('grade-items');

  const load = () => api.gradeItems().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    Promise.all([load(), api.classSubjects().then(setSubjects)])
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ subject_id: r.subject_id || '', item_name: r.item_name || '' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { subject_id: Number(form.subject_id), item_name: form.item_name };
      if (editing) await api.updateGradeItem(editing.item_id, payload);
      else await api.createGradeItem(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this grade item and its grades?')) return;
    try { await api.deleteGradeItem(id); setRows(p => p.filter(r => r.item_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Grade Items" subtitle={`${rows.length} assessment${rows.length === 1 ? '' : 's'}`}
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Item</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {rows.map((r, i) => <GradeItemCard key={r.item_id} r={r} i={i} onEdit={openEdit} onDelete={remove} canEdit={canEdit} />)}
          {rows.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No grade items yet.</p>}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Grade Item' : 'Add Grade Item'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Subject *
            <select required value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} style={input()}>
              <option value="">Select subject…</option>
              {subjects.map(s => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.class_name} — {s.course_title} ({s.teacher_name})
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Assessment *
            <select required value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} style={input()}>
              <option value="">Select assessment…</option>
              {ITEMS.map(it => (
                <option key={it.name} value={it.name}>{it.name} — {it.points} pts</option>
              ))}
            </select>
          </label>

          <p style={{ margin: 0, fontSize: 11.5, color: T.muted }}>
            Each subject has exactly three assessments: Assignment (30), Mid Exam (30), Final Exam (40). Total = 100 points.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
            <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}