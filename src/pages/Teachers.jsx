import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, card, btn, input } from '../theme';
import { useResponsive, useHover } from '../hooks';

const EMPTY = { name: '', email: '', subject: '', username: '', password: '' };

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

function TeacherCard({ t, i, onEdit, onDelete }) {
  const { hovered, bind } = useHover();
  return (
    <motion.article
      {...bind}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ ...card(hovered), padding: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}
    >
      <Avatar name={t.name} size={54} />
      <h3 style={{ fontSize: 16, marginTop: 4 }}>{t.name}</h3>
      <span style={{
        fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 999,
        background: 'rgba(124,92,255,0.16)', border: '1px solid rgba(124,92,255,0.3)', color: '#c4b5fd',
      }}>{t.subject || 'General'}</span>
      <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: T.muted, margin: 0, wordBreak: 'break-all' }}>
        <Icon name="mail" size={14} /> {t.email}
      </p>
      {t.username ? (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
          background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.32)', color: '#6ee7b7',
        }}>🔑 {t.username}</span>
      ) : (
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
          background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.border}`, color: T.muted,
        }}>No login</span>
      )}
      <div style={{
        marginTop: 6, display: 'flex', alignItems: 'center', gap: 7,
        fontSize: 12.5, color: T.muted,
        paddingTop: 12, borderTop: `1px solid ${T.border}`, width: '100%', justifyContent: 'center',
      }}>
        <Icon name="book" size={15} /> {t.courses_count} course{t.courses_count === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <EditBtn onClick={() => onEdit(t)} />
        <DeleteBtn onClick={() => onDelete(t.teacher_id)} />
      </div>
    </motion.article>
  );
}

export default function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();

  const load = () => api.teachers().then(setTeachers).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      email: t.email || '',
      subject: t.subject || '',
      username: t.username || '',
      password: '',
    });
    setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        subject: form.subject,
        username: form.username.trim(),
        password: form.password,
      };
      if (editing) await api.updateTeacher(editing.teacher_id, payload);
      else await api.createTeacher(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    try { await api.deleteTeacher(id); setTeachers(p => p.filter(t => t.teacher_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Teachers" subtitle={`${teachers.length} faculty member${teachers.length === 1 ? '' : 's'}`}
      action={<PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Teacher</PrimaryBtn>}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {loading ? <Skeleton rows={3} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(258px, 1fr))', gap: 18 }}>
          {teachers.map((t, i) => <TeacherCard key={t.teacher_id} t={t} i={i} onEdit={openEdit} onDelete={remove} />)}
          {teachers.length === 0 && <p style={{ color: T.muted, textAlign: 'center', padding: 26 }}>No teachers yet.</p>}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Teacher' : 'Add Teacher'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <FInput label="Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Jane Smith" />
          <FInput label="Email *" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="jane@school.edu" />
          <FInput label="Subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Mathematics" />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '6px 0', fontSize: 11.5, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted,
          }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            Login account (optional)
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
            <FInput
              label={editing && editing.user_id ? 'Username (linked)' : 'Username'}
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="teacher1"
            />
            <FInput
              label={editing && editing.user_id ? 'New password (leave blank to keep)' : 'Password'}
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: T.muted }}>
            Fill both to let this teacher sign in. Leave blank to create the record without a login.
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