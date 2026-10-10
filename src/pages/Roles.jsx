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

const EMPTY = { role_name: '' };

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

function RoleCard({ r, i, onEdit, onDelete }) {
  const { hovered, bind } = useHover();
  return (
    <motion.article
      {...bind}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.06 }}
      style={{ ...card(hovered), padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}
    >
      <div style={{
        width: 54, height: 54, borderRadius: 14, display: 'grid', placeItems: 'center',
        background: 'linear-gradient(135deg, #7c5cff, #22d3ee)', color: '#fff', fontWeight: 800, fontSize: 20,
      }}>
        {r.role_name[0].toUpperCase()}
      </div>
      <h3 style={{ fontSize: 16 }}>{r.role_name}</h3>
      <span style={chip(true)}>#{r.role_id}</span>
      <div style={{
        marginTop: 6, paddingTop: 12, borderTop: `1px solid ${T.border}`, width: '100%',
        display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', fontSize: 12.5, color: T.muted,
      }}>
        <Icon name="users" size={15} /> {r.users_count} user{r.users_count === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <EditBtn onClick={() => onEdit(r)} />
        <DeleteBtn onClick={() => onDelete(r.role_id)} />
      </div>
    </motion.article>
  );
}

export default function Roles() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();

  const load = () => api.roles().then(setRows).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ role_name: r.role_name }); setOpen(true); };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.updateRole(editing.role_id, form);
      else await api.createRole(form);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this role?')) return;
    try { await api.deleteRole(id); setRows(p => p.filter(r => r.role_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Roles" subtitle={`${rows.length} role${rows.length === 1 ? '' : 's'}`}
      action={<PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Role</PrimaryBtn>}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {rows.map((r, i) => <RoleCard key={r.role_id} r={r} i={i} onEdit={openEdit} onDelete={remove} />)}
          {rows.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No roles yet.</p>}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Role' : 'Add Role'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <FInput label="Role name *" required value={form.role_name} onChange={e => setForm({ ...form, role_name: e.target.value })} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
            <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}