import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, btn, input, chip, gradeStyle } from '../theme';
import { useResponsive, useHover } from '../hooks';

const EMPTY = { username: '', password: '', role_id: '', status: 'active' };
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

function FInput({ label, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
      {label}
      <input {...props} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={input(focus)} />
    </label>
  );
}

export default function Users() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();

  const load = () => api.users().then(setRows).catch(e => setError(e.message));
  useEffect(() => {
    Promise.all([load(), api.roles().then(setRoles)]).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ username: u.username, password: '', role_id: u.role_id || '', status: u.status || 'active' });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, role_id: Number(form.role_id) };
      if (!payload.password) delete payload.password;
      if (editing) await api.updateUser(editing.user_id, payload);
      else await api.createUser(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await api.deleteUser(id); setRows(p => p.filter(r => r.user_id !== id)); }
    catch (err) { setError(err.message); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const labels = ['User', 'Role', 'Status', 'Created', ''];

  return (
    <Page title="Users" subtitle={`${rows.length} login account${rows.length === 1 ? '' : 's'}`}
      action={<PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add User</PrimaryBtn>}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          rows.map((u, i) => (
            <motion.div key={u.user_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              style={{ marginBottom: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <Avatar name={u.username} size={32} />
                <strong>{u.username}</strong>
              </div>
              {[
                ['Role', <span style={chip()}>{u.role_name || '—'}</span>],
                ['Status', <span style={gradeStyle(u.status === 'active' ? 'A' : 'F')}>{u.status}</span>],
                ['Created', <span style={{ color: T.muted, fontSize: 12.5 }}>{fmt(u.created_at)}</span>],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', gap: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted }}>{l}</span>
                  <div style={{ textAlign: 'right' }}>{v}</div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '6px 16px 10px' }}>
                <EditBtn onClick={() => openEdit(u)} />
                <DeleteBtn onClick={() => remove(u.user_id)} />
              </div>
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{labels.map((h, i) => (
              <th key={i} style={{ textAlign: i === 4 ? 'right' : 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {rows.map((u, i) => (
                <motion.tr key={u.user_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.35) }}>
                  <td style={cell}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={u.username} size={36} />
                      <div><strong>{u.username}</strong><span style={{ display: 'block', color: T.muted, fontSize: 12.5 }}>#{u.user_id}</span></div>
                    </div>
                  </td>
                  <td style={cell}><span style={chip()}>{u.role_name || '—'}</span></td>
                  <td style={cell}><span style={gradeStyle(u.status === 'active' ? 'A' : 'F')}>{u.status}</span></td>
                  <td style={cell}><span style={{ color: T.muted, fontSize: 12.5 }}>{fmt(u.created_at)}</span></td>
                  <td style={{ ...cell, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <EditBtn onClick={() => openEdit(u)} />
                      <DeleteBtn onClick={() => remove(u.user_id)} />
                    </div>
                  </td>
                </motion.tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No users yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit User' : 'Add User'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
            <FInput label="Username *" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            <FInput label={editing ? 'Password (leave blank to keep)' : 'Password *'} required={!editing} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Role *
              <select required value={form.role_id} onChange={e => setForm({ ...form, role_id: e.target.value })} style={input()}>
                <option value="">Select role…</option>
                {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
              Status
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={input()}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button type="button" onClick={closeModal} style={btn('ghost')}>Cancel</button>
            <PrimaryBtn type="submit">{saving ? 'Saving…' : editing ? 'Update' : 'Save'}</PrimaryBtn>
          </div>
        </form>
      </Modal>
    </Page>
  );
}