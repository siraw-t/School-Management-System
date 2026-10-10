/* Central role → capability map.
   Uses the exact values stored in roles.role_name: 'Admin', 'Teacher', 'Student'. */

export const NAV_ROLES = {
  '/':               ['Admin', 'Teacher', 'Student'],
  '/students':       ['Admin', 'Teacher'],
  '/teachers':       ['Admin'],
  '/courses':        ['Admin', 'Teacher', 'Student'],
  '/classes':        ['Admin', 'Teacher', 'Student'],   // ← was ['Admin']
  '/class-subjects': ['Admin', 'Teacher', 'Student'],   // ← was ['Admin', 'Teacher']
  '/enrollments':    ['Admin', 'Teacher', 'Student'],
  '/attendance':     ['Admin', 'Teacher', 'Student'],
  '/grade-items':    ['Admin', 'Teacher'],
  '/student-grades': ['Admin', 'Teacher', 'Student'],
  '/cgpa':           ['Admin', 'Teacher', 'Student'],
  '/academic-years': ['Admin'],
  '/users':          ['Admin'],
  '/roles':          ['Admin'],
  '/reports': ['Admin', 'Teacher', 'Student'],
};

const WRITE_PERMS = {
  Admin: [
    'students', 'teachers', 'courses', 'enrollments',
    'classes', 'class-subjects', 'attendance',
    'grade-items', 'student-grades',
    'academic-years', 'users', 'roles',
  ],
  Teacher: ['attendance', 'grade-items', 'student-grades'],
  Student: [],
};

export function canSeeNav(role, path) {
  if (!role) return false;
  return (NAV_ROLES[path] || []).includes(role);
}

export function canWrite(role, resource) {
  if (!role) return false;
  return (WRITE_PERMS[role] || []).includes(resource);
}

export function canAccessRoute(role, path) {
  return canSeeNav(role, path);
}