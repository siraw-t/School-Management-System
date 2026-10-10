import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page';
import Skeleton from '../components/Skeleton';
import Icon from '../components/Icon';
import { api } from '../api';
import { T, input } from '../theme';
import { useResponsive, useHover } from '../hooks';

const REPORTS = [
  { key: 'students',       label: 'Students',       icon: 'users'    },
  { key: 'teachers',       label: 'Teachers',       icon: 'teacher'  },
  { key: 'courses',        label: 'Courses',        icon: 'book'     },
  { key: 'enrollments',    label: 'Enrollments',    icon: 'clipboard'},
  { key: 'attendance',     label: 'Attendance',     icon: 'calendar' },
  { key: 'student-grades', label: 'Student Grades', icon: 'award'    },
  { key: 'cgpa',           label: 'CGPA',           icon: 'star'     },
];

const COLUMNS = {
  students:       [['student_id','ID'],['name','Name'],['email','Email'],['age','Age'],['class_name','Class'],['address','Address'],['phone','Phone'],['courses_count','Courses']],
  teachers:       [['teacher_id','ID'],['name','Name'],['email','Email'],['subject','Subject'],['courses_count','Courses'],['subjects_count','Assignments']],
  courses:        [['course_id','ID'],['title','Course'],['credits','Credits'],['teacher_name','Teacher'],['subject','Subject'],['enrolled','Enrolled']],
  enrollments:    [['enrollment_id','ID'],['student_name','Student'],['course_title','Course'],['credits','Credits'],['grade','Grade'],['grade_points','Points'],['enrolled_on','Enrolled On']],
  attendance:     [['attendance_id','ID'],['student_name','Student'],['class_name','Class'],['course_title','Course'],['attendance_date','Date'],['status','Status'],['remarks','Remarks']],
  'student-grades':[['grade_id','ID'],['student_name','Student'],['course_title','Course'],['item_name','Item'],['points_earned','Score'],['max_points','Max'],['percentage','%'],['letter','Grade'],['graded_at','Graded']],
  cgpa:           [['student_id','ID'],['name','Student'],['email','Email'],['total_credits','Credits'],['quality_points','Quality Pts'],['courses_graded','Graded'],['courses_total','Total'],['cgpa','CGPA']],
};

function esc(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCSV(cols, rows) {
  const header = cols.map(([, l]) => esc(l)).join(',');
  const body = rows.map(r => cols.map(([k]) => esc(r[k])).join(',')).join('\n');
  return header + '\n' + body;
}
function download(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
const exportCSV  = (type, cols, rows) => download(toCSV(cols, rows), `${type}-report-${Date.now()}.csv`, 'text/csv;charset=utf-8');
const exportJSON = (type, rows)       => download(JSON.stringify(rows, null, 2), `${type}-report-${Date.now()}.json`, 'application/json');
function exportExcel(type, cols, rows) {
  const e = (v) => v == null ? '' : String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const header = cols.map(([, l]) => `<th>${e(l)}</th>`).join('');
  const body = rows.map(r => `<tr>${cols.map(([k]) => `<td>${e(r[k])}</td>`).join('')}</tr>`).join('');
  download(`<html><head><meta charset="utf-8"></head><body><table border="1">${header ? `<tr>${header}</tr>` : ''}${body}</table></body></html>`,
    `${type}-report-${Date.now()}.xls`, 'application/vnd.ms-excel');
}

function IconBtn({ onClick, name, label, tone = 'ghost' }) {
  const { hovered, bind } = useHover();
  const primary = tone === 'primary';
  return (
    <button onClick={onClick} {...bind} title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '10px 14px', borderRadius: 11, cursor: 'pointer',
        fontSize: 12.5, fontWeight: 600, transition: 'all 0.2s',
        background: primary ? 'linear-gradient(135deg,#7c5cff,#5b8cff)' : hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${primary ? 'transparent' : T.border}`,
        color: primary ? '#fff' : hovered ? T.text : T.muted,
      }}>
      <Icon name={name} size={15} /> {label}
    </button>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: T.muted, minWidth: 160, flex: 1 }}>
      {label}
      <select value={value} onChange={onChange} style={input()}>{children}</select>
    </label>
  );
}

export default function Reports() {
  const [type, setType]       = useState('students');
  const [params, setParams]   = useState({});
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [filters, setFilters] = useState({ years: [], classes: [], courses: [], subjects: [], teachers: [], students: [] });
  const { isMobile } = useResponsive();
  const printRef = useRef();

  const cols = COLUMNS[type] || [];

  useEffect(() => {
    api.reportFilters().then(setFilters).catch(() => {});
  }, []);

  const runReport = async (nextType = type, nextParams = params) => {
    setLoading(true); setError('');
    try {
      const data = await api.report(nextType, nextParams);
      setRows(data.rows || []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { setParams({}); runReport(type, {}); /* eslint-disable-next-line */ }, [type]);

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const clearParams = () => { setParams({}); runReport(type, {}); };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const e = (v) => v == null ? '' : String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const header = cols.map(([, l]) => `<th>${e(l)}</th>`).join('');
    const body = rows.map(r => `<tr>${cols.map(([k]) => `<td>${e(r[k])}</td>`).join('')}</tr>`).join('');
    const report = REPORTS.find(x => x.key === type);
    const subtitle = Object.entries(params).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(' · ') || 'No filters';
    w.document.write(`
      <html><head><title>${report?.label} Report</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; padding: 30px; color: #111; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
        th { background: #f4f4f7; font-weight: 600; }
        @media print { @page { margin: 12mm; } }
      </style></head>
      <body>
        <h1>${report?.label} Report</h1>
        <div class="meta">Generated ${new Date().toLocaleString()} · ${subtitle}</div>
        <table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
      </body></html>
    `);
    w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Page title="Reports" subtitle="Filter by year, class, course, teacher, student, dates. Print or export.">
      {/* Report type tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        {REPORTS.map(r => (
          <button key={r.key} onClick={() => setType(r.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', borderRadius: 11, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, transition: 'all 0.2s',
              background: type === r.key ? 'linear-gradient(90deg, rgba(124,92,255,0.22), rgba(34,211,238,0.08))' : T.surface,
              border: `1px solid ${type === r.key ? 'rgba(124,92,255,0.45)' : T.border}`,
              color: type === r.key ? '#fff' : T.muted,
            }}>
            <Icon name={r.icon} size={15} /> {r.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 16, marginBottom: 18, background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, backdropFilter: 'blur(14px)' }}>
        <Select label="Academic Year" value={params.year_id || ''} onChange={e => set('year_id', e.target.value)}>
          <option value="">All years</option>
          {filters.years.map(y => <option key={y.year_id} value={y.year_id}>{y.year_name}</option>)}
        </Select>

        {['students','enrollments','attendance','student-grades','cgpa'].includes(type) && (
          <Select label="Class" value={params.class_id || ''} onChange={e => set('class_id', e.target.value)}>
            <option value="">All classes</option>
            {filters.classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
          </Select>
        )}

        {['courses','enrollments','attendance','student-grades'].includes(type) && (
          <Select label="Course" value={params.course_id || ''} onChange={e => set('course_id', e.target.value)}>
            <option value="">All courses</option>
            {filters.courses.map(c => <option key={c.course_id} value={c.course_id}>{c.title}</option>)}
          </Select>
        )}

        {['attendance','student-grades'].includes(type) && (
          <Select label="Class Subject" value={params.subject_id || ''} onChange={e => set('subject_id', e.target.value)}>
            <option value="">All subjects</option>
            {filters.subjects.map(s => <option key={s.subject_id} value={s.subject_id}>{s.class_name} — {s.course_title} ({s.teacher_name || 'No teacher'})</option>)}
          </Select>
        )}

        {['courses','enrollments','attendance','student-grades'].includes(type) && (
          <Select label="Teacher" value={params.teacher_id || ''} onChange={e => set('teacher_id', e.target.value)}>
            <option value="">All teachers</option>
            {filters.teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.name}</option>)}
          </Select>
        )}

        {['enrollments','attendance','student-grades'].includes(type) && (
          <Select label="Student" value={params.student_id || ''} onChange={e => set('student_id', e.target.value)}>
            <option value="">All students</option>
            {filters.students.map(s => <option key={s.student_id} value={s.student_id}>{s.name}</option>)}
          </Select>
        )}

        {type === 'enrollments' && (
          <Select label="Grade" value={params.grade || ''} onChange={e => set('grade', e.target.value)}>
            <option value="">Any grade</option>
            {['A+','A','A-','B+','B','B-','C','D','F'].map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
        )}

        {type === 'attendance' && (
          <Select label="Status" value={params.status || ''} onChange={e => set('status', e.target.value)}>
            <option value="">Any status</option>
            {['Present','Absent','Late','Excused'].map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        )}

        {type === 'student-grades' && (
          <Select label="Assessment" value={params.item_name || ''} onChange={e => set('item_name', e.target.value)}>
            <option value="">Any assessment</option>
            {['Assignment','Mid Exam','Final Exam'].map(i => <option key={i} value={i}>{i}</option>)}
          </Select>
        )}

        {['enrollments','attendance','student-grades'].includes(type) && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: T.muted, minWidth: 150, flex: 1 }}>
              From date
              <input type="date" value={params.from || ''} onChange={e => set('from', e.target.value)} style={input()} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: T.muted, minWidth: 150, flex: 1 }}>
              To date
              <input type="date" value={params.to || ''} onChange={e => set('to', e.target.value)} style={input()} />
            </label>
          </>
        )}

        {type === 'cgpa' && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: T.muted, minWidth: 130, flex: 1 }}>
              Min CGPA
              <input type="number" step="0.01" min="0" max="4" value={params.min || ''} onChange={e => set('min', e.target.value)} placeholder="0.00" style={input()} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 600, color: T.muted, minWidth: 130, flex: 1 }}>
              Max CGPA
              <input type="number" step="0.01" min="0" max="4" value={params.max || ''} onChange={e => set('max', e.target.value)} placeholder="4.00" style={input()} />
            </label>
          </>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <IconBtn onClick={() => runReport(type, params)} name="search" label="Run" tone="primary" />
          <IconBtn onClick={clearParams} name="close" label="Clear" />
        </div>
      </div>

      {/* Export toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12.5, color: T.muted, marginRight: 6 }}>
          {loading ? 'Loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'}`}
        </span>
        <IconBtn onClick={handlePrint} name="clipboard" label="Print" />
        <IconBtn onClick={handlePrint} name="award"     label="PDF"   />
        <IconBtn onClick={() => exportExcel(type, cols, rows)} name="book"      label="Excel" />
        <IconBtn onClick={() => exportCSV  (type, cols, rows)} name="clipboard" label="CSV"   />
        <IconBtn onClick={() => exportJSON (type, rows)}       name="users"     label="JSON"  />
      </div>

      {error && <div style={{ padding: '13px 16px', marginBottom: 18, borderRadius: 12, fontSize: 13, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.32)', color: '#fca5a5' }}>{error}</div>}

      {/* Table */}
      <div ref={printRef} style={{
        background: isMobile ? 'transparent' : T.surface,
        border: isMobile ? 'none' : `1px solid ${T.border}`,
        borderRadius: T.radius, padding: isMobile ? 0 : 8,
        backdropFilter: 'blur(14px)', overflowX: 'auto',
      }}>
        {loading ? <Skeleton rows={6} /> : rows.length === 0 ? (
          <div style={{ textAlign: 'center', color: T.muted, padding: 40 }}>
            No data. Adjust the filters and click <strong>Run</strong>.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                {cols.map(([k, label]) => (
                  <th key={k} style={{ textAlign: 'left', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted, padding: '12px 14px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <motion.tr key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}>
                  {cols.map(([k]) => (
                    <td key={k} style={{ padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.045)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {r[k] == null || r[k] === '' ? <span style={{ color: T.muted }}>—</span> : String(r[k])}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Page>
  );
}