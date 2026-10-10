const BASE = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY = 'edupanel_session';

function getToken() {
  try {
    const raw =
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.token || null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(BASE + path, { headers, ...options });

  const isAuthEndpoint = path.startsWith('/auth/login');

  if (res.status === 401 && !isAuthEndpoint) {
    clearSession();
    if (window.location.pathname !== '/login') window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  /* auth */
  login: (d) => request('/auth/login', { method: 'POST', body: JSON.stringify(d) }),
  me: () => request('/auth/me'),

  stats: () => request('/stats'),

  students: () => request('/students'),
  createStudent: (d) => request('/students', { method: 'POST', body: JSON.stringify(d) }),
  updateStudent: (id, d) => request(`/students/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteStudent: (id) => request(`/students/${id}`, { method: 'DELETE' }),

  courses: () => request('/courses'),
  createCourse: (d) => request('/courses', { method: 'POST', body: JSON.stringify(d) }),
  updateCourse: (id, d) => request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteCourse: (id) => request(`/courses/${id}`, { method: 'DELETE' }),

  teachers: () => request('/teachers'),
  createTeacher: (d) => request('/teachers', { method: 'POST', body: JSON.stringify(d) }),
  updateTeacher: (id, d) => request(`/teachers/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteTeacher: (id) => request(`/teachers/${id}`, { method: 'DELETE' }),

  enrollments: () => request('/enrollments'),
  createEnrollment: (d) => request('/enrollments', { method: 'POST', body: JSON.stringify(d) }),
  updateEnrollment: (id, d) => request(`/enrollments/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteEnrollment: (id) => request(`/enrollments/${id}`, { method: 'DELETE' }),

  roles: () => request('/roles'),
  createRole: (d) => request('/roles', { method: 'POST', body: JSON.stringify(d) }),
  updateRole: (id, d) => request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteRole: (id) => request(`/roles/${id}`, { method: 'DELETE' }),

  users: () => request('/users'),
  createUser: (d) => request('/users', { method: 'POST', body: JSON.stringify(d) }),
  updateUser: (id, d) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  academicYears: () => request('/academic-years'),
  createAcademicYear: (d) => request('/academic-years', { method: 'POST', body: JSON.stringify(d) }),
  updateAcademicYear: (id, d) => request(`/academic-years/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteAcademicYear: (id) => request(`/academic-years/${id}`, { method: 'DELETE' }),

  classes: () => request('/classes'),
  createClass: (d) => request('/classes', { method: 'POST', body: JSON.stringify(d) }),
  updateClass: (id, d) => request(`/classes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteClass: (id) => request(`/classes/${id}`, { method: 'DELETE' }),

  classSubjects: () => request('/class-subjects'),
  createClassSubject: (d) => request('/class-subjects', { method: 'POST', body: JSON.stringify(d) }),
  updateClassSubject: (id, d) => request(`/class-subjects/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteClassSubject: (id) => request(`/class-subjects/${id}`, { method: 'DELETE' }),

  attendance: () => request('/attendance'),
  createAttendance: (d) => request('/attendance', { method: 'POST', body: JSON.stringify(d) }),
  updateAttendance: (id, d) => request(`/attendance/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteAttendance: (id) => request(`/attendance/${id}`, { method: 'DELETE' }),

  gradeItems: () => request('/grade-items'),
  createGradeItem: (d) => request('/grade-items', { method: 'POST', body: JSON.stringify(d) }),
  updateGradeItem: (id, d) => request(`/grade-items/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteGradeItem: (id) => request(`/grade-items/${id}`, { method: 'DELETE' }),

  studentGrades: () => request('/student-grades'),
  createStudentGrade: (d) => request('/student-grades', { method: 'POST', body: JSON.stringify(d) }),
  updateStudentGrade: (id, d) => request(`/student-grades/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteStudentGrade: (id) => request(`/student-grades/${id}`, { method: 'DELETE' }),

  /* cgpa */
  cgpa: () => request('/cgpa'),
  studentCGPA: (id) => request(`/students/${id}/cgpa`),

  /* reports */
  report: (type, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return request(`/reports/${type}${qs ? '?' + qs : ''}`);
  },
  reportFilters: () => request('/reports/filters'),
};