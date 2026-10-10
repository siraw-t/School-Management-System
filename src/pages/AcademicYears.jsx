import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, card, btn, input, chip } from '../theme';
import { useResponsive, useHover } from '../hooks';

const EMPTY = { year_name: '', is_current: false };

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

function YearCard({ r, i, onEdit, onDelete }) {
  const { hovered, bind } = useHover();
  return (
    <motion.article
      {...bind}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.07 }}
      style={{ ...card(hovered), padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700,
          background: 'rgba(34,211,238,0.14)', border: '1px solid rgba(34,211,238,0.3)', color: '#67e8f9',
        }}>{r.classes_count} classes</span>
        {r.is_current ? (
          <span style={{ ...chip(), background: 'rgba(52,211,153,0.18)', borderColor: 'rgba(52,211,153,0.4)', color: '#6ee7b7' }}>Current</span>
        ) : (
          <span style={chip(true)}>Past</span>
        )}
      </div>
      <h3 style={{ fontSize: 16.5, lineHeight: 1.35 }}>{r.year_name}</h3>
      <span style={{ fontSize: 12, color: T.muted }}>Year #{r.year_id}</span>
      <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end', marginTop: 4 }}>
        <EditBtn onClick={() => onEdit(r)} />
        <DeleteBtn onClick={() => onDelete(r.year_id)} />
      </div>
    </motion.article>
  );
}

export default function AcademicYears() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();

  const load = () => api.academicYears().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ year_name: r.year_name || '', is_current: !!r.is_current });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.updateAcademicYear(editing.year_id, form);
      else await api.createAcademicYear(form);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this year?')) return;
    try { await api.deleteAcademicYear(id); setRows(p => p.filter(r => r.year_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Academic Years" subtitle={`${rows.length} year${rows.length === 1 ? '' : 's'}`}
      action={<PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Year</PrimaryBtn>}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {rows.map((r, i) => <YearCard key={r.year_id} r={r} i={i} onEdit={openEdit} onDelete={remove} />)}
          {rows.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No academic years yet.</p>}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Academic Year' : 'Add Academic Year'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <FInput label="Year name *" required value={form.year_name} onChange={e => setForm({ ...form, year_name: e.target.value })} />
          <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 10, fontSize: 13, color: T.text, fontWeight: 500, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_current} onChange={e => setForm({ ...form, is_current: e.target.checked })} style={{ width: 16, height: 16, accentColor: T.accent, cursor: 'pointer' }} />
            Mark as current year
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