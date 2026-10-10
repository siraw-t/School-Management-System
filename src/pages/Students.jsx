import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Modal from '../components/Modal';
import Avatar from '../components/Avatar';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import EditBtn from '../components/EditBtn';
import { api } from '../api';
import { T, btn, input, chip } from '../theme';
import { useResponsive, useHover, useCan } from '../hooks';

const EMPTY = {
  name: '', email: '', age: '', address: '', phone: '', bio: '',
  current_class_id: '', username: '', password: '',
};
const cellStyle = { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.045)', fontSize: 13.5, verticalAlign: 'middle' };

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

function FSelect({ label, value, onChange, children, required }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
      {label}
      <select required={required} value={value} onChange={onChange}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={input(focus)}>
        {children}
      </select>
    </label>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { isMobile } = useResponsive();
  const canEdit = useCan('students');

  const load = () => api.students().then(setStudents).catch(e => setError(e.message)).finally(() => setLoading(false));
  useEffect(() => {
    load();
    api.classes().then(setClasses).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      [s.name, s.email, s.address, s.phone, s.class_name].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [students, query]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      email: s.email || '',
      age: s.age ?? '',
      address: s.address || '',
      phone: s.phone || '',
      bio: s.bio || '',
      current_class_id: s.current_class_id || '',
      username: s.username || '',
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
        age: form.age ? Number(form.age) : null,
        address: form.address,
        phone: form.phone,
        bio: form.bio,
        current_class_id: form.current_class_id ? Number(form.current_class_id) : null,
        username: form.username.trim(),
        password: form.password,
      };
      if (editing) await api.updateStudent(editing.student_id, payload);
      else await api.createStudent(payload);
      closeModal(); await load();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await api.deleteStudent(id); setStudents(p => p.filter(s => s.student_id !== id)); }
    catch (err) { setError(err.message); }
  };

  return (
    <Page title="Students" subtitle={`${students.length} enrolled student${students.length === 1 ? '' : 's'}`}
      action={canEdit ? <PrimaryBtn onClick={openAdd}><Icon name="plus" size={16} /> Add Student</PrimaryBtn> : null}>
      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', maxWidth: isMobile ? '100%' : 420, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 13, color: T.muted }}>
          <Icon name="search" size={16} />
          <input placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '12px 0', fontSize: 13.5, color: T.text }} />
        </div>
      </div>

      <div style={{ background: isMobile ? 'transparent' : T.surface, border: isMobile ? 'none' : `1px solid ${T.border}`, borderRadius: T.radius, padding: isMobile ? 0 : 8, backdropFilter: 'blur(14px)' }}>
        {loading ? <Skeleton rows={6} /> : isMobile ? (
          filtered.map((s, i) => (
            <motion.div key={s.student_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}
              style={{ marginBottom: 14, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
                <Avatar name={s.name} size={36} />
                <div>
                  <strong>{s.name}</strong>
                  <span style={{ display: 'block', color: T.muted, fontSize: 12.5 }}>{s.email}</span>
                </div>
              </div>
              {[
                ['Class', s.class_name ? <span style={chip()}>{s.class_name}</span> : <span style={{ color: T.muted }}>—</span>],
                ['Age', s.age ?? '—'],
                ['Phone', s.phone || '—'],
                ['Courses', <span style={chip(true)}>{s.courses_count}</span>],
                ['Login', s.username ? <span style={{ fontSize: 11.5, color: '#6ee7b7' }}>🔑 {s.username}</span> : <span style={{ fontSize: 11.5, color: T.muted }}>—</span>],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: T.muted }}>{l}</span>
                  <div>{v}</div>
                </div>
              ))}
              {canEdit && (
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '6px 16px 10px' }}>
                  <EditBtn onClick={() => openEdit(s)} />
                  <DeleteBtn onClick={() => remove(s.student_id)} />
                </div>
              )}
            </motion.div>
          ))
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Student', 'Class', 'Email', 'Age', 'Courses', 'Login', ''].map((h, i) => (
              <th key={i} style={{ textAlign: i === 6 ? 'right' : 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '14px 16px', borderBottom: `1px solid ${T.border}` }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr key={s.student_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={s.name} size={36} />
                      <div>
                        <strong>{s.name}</strong>
                        <span style={{ display: 'block', color: T.muted, fontSize: 12.5 }}>{s.address || 'No address'}</span>
                      </div>
                    </div>
                  </td>
                  <td style={cellStyle}>
                    {s.class_name ? <span style={chip()}>{s.class_name}</span> : <span style={{ color: T.muted }}>—</span>}
                  </td>
                  <td style={cellStyle}><span style={{ color: T.muted, fontSize: 12.5 }}>{s.email}</span></td>
                  <td style={cellStyle}>{s.age ?? '—'}</td>
                  <td style={cellStyle}><span style={chip(true)}>{s.courses_count}</span></td>
                  <td style={cellStyle}>
                    {s.username ? (
                      <span style={{
                        fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                        background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.32)', color: '#6ee7b7',
                      }}>🔑 {s.username}</span>
                    ) : <span style={{ color: T.muted, fontSize: 12.5 }}>—</span>}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'right' }}>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <EditBtn onClick={() => openEdit(s)} />
                        <DeleteBtn onClick={() => remove(s.student_id)} />
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: T.muted, padding: 26 }}>No students.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={closeModal} title={editing ? 'Edit Student' : 'Add Student'}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15 }}>
            <FInput label="Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <FInput label="Email *" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <FInput label="Age" type="number" min="1" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
            <FInput label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>

          <FSelect label="Current class" value={form.current_class_id}
            onChange={e => setForm({ ...form, current_class_id: e.target.value })}>
            <option value="">Unassigned</option>
            {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
          </FSelect>

          <FInput label="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <label style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 12.5, fontWeight: 600, color: T.muted }}>
            Bio
            <textarea rows="3" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} style={{ ...input(false), resize: 'vertical' }} />
          </label>

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
            <FInput label={editing && editing.user_id ? 'Username (linked)' : 'Username'}
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            <FInput label={editing && editing.user_id ? 'New password (blank to keep)' : 'Password'}
              type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>

          <p style={{ margin: 0, fontSize: 11.5, color: T.muted }}>
            Fill both to let this student sign in. Leave blank to create the record without a login.
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