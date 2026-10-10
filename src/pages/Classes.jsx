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

const EMPTY = { class_name: '', year_id: '' };

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

function ClassCard({ r, i, onEdit, onDelete, canEdit }) {
  const { hovered, bind } = useHover();
  const pct = Math.min(r.students_count * 10, 100);
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
        }}>{r.subjects_count} subjects</span>
        <span style={chip(true)}>#{r.class_id}</span>
      </div>
      <h3 style={{ fontSize: 16.5, lineHeight: 1.35 }}>{r.class_name}</h3>
      <p style={{ margin: 0, fontSize: 13, color: T.muted }}>{r.year_name || 'No academic year'}</p>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ height: 7, borderRadius: 7, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.7 }}
            style={{ height: '100%', borderRadius: 7, background: 'linear-gradient(90deg, #7c5cff, #22d3ee)' }}
          />
        </div>
        <span style={{ fontSize: 12, color: T.muted }}>{r.students_count} students</span>
      </div>
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <EditBtn onClick={() => onEdit(r)} />
          <DeleteBtn onClick={() => onDelete(r.class_id)} />
        </div>
      )}
    </motion.article>
  );
}

export default function Classes() {
  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('classes');

  const load = () => api.classes().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    Promise.all([load(), canEdit ? api.academicYears().then(setYears).catch(() => {}) : Promise.resolve()])
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ class_name: r.class_name || '', year_id: r.year_id || '' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { class_name: form.class_name, year_id: form.year_id ? Number(form.year_id) : null };
      if (editing) await api.updateClass(editing.class_id, payload);
      else await api.createClass(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try { await api.deleteClass(id); setRows(p => p.filter(r => r.class_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Classes"
      subtitle={
        canEdit
          ? `${rows.length} class${rows.length === 1 ? '' : 'es'}`
          : `Your class${rows.length === 1 ? '' : 'es'}`
      }
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Class</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {rows.map((r, i) => <ClassCard key={r.class_id} r={r} i={i} onEdit={openEdit} onDelete={remove} canEdit={canEdit} />)}
          {rows.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No classes to show.</p>}
        </div>
      )}

      {canEdit && (
        <Modal open={open} onClose={closeModal} title={editing ? 'Edit Class' : 'Add Class'}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <FInput label="Class name *" required value={form.class_name} onChange={e => setForm({ ...form, class_name: e.target.value })} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Academic year
              <select value={form.year_id} onChange={e => setForm({ ...form, year_id: e.target.value })} style={input()}>
                <option value="">None</option>
                {years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
              <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}
    </Page>
  );
}