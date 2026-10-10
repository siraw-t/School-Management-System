const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const ITEM_DEFAULTS = {
  'Assignment': 30,
  'Mid Exam':   30,
  'Final Exam': 40,
};

function authRequired(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role ${allowed.join(' or ')}` });
    }
    next();
  };
}

/* ---------- Identity helpers: map users.user_id → teachers/students row ---------- */
async function getTeacherId(userId) {
  const [r] = await db.query('SELECT teacher_id FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
  return r.length ? r[0].teacher_id : null;
}
async function getStudentId(userId) {
  const [r] = await db.query('SELECT student_id FROM students WHERE user_id = ? LIMIT 1', [userId]);
  return r.length ? r[0].student_id : null;
}
async function teacherOwnsSubject(userId, subjectId) {
  const teacherId = await getTeacherId(userId);
  if (!teacherId) return false;
  const [r] = await db.query(
    'SELECT subject_id FROM class_subjects WHERE subject_id = ? AND teacher_id = ?',
    [subjectId, teacherId]
  );
  return r.length > 0;
}

/* ============================== AUTH ==================================== */
router.post('/auth/login', wrap(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const [rows] = await db.query(
    `SELECT u.user_id, u.username, u.password_hash, u.status, r.role_name
     FROM users u LEFT JOIN roles r ON r.role_id = u.role_id
     WHERE u.username = ? LIMIT 1`,
    [username]
  );
  if (!rows.length) return res.status(401).json({ error: 'Invalid credentials.' });
  const u = rows[0];
  if (u.status !== 'active') return res.status(403).json({ error: 'Account is inactive.' });

  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

  const token = jwt.sign(
    { user_id: u.user_id, username: u.username, role: u.role_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({
    token,
    user: { user_id: u.user_id, username: u.username, role: u.role_name },
  });
}));

router.get('/auth/me', authRequired, wrap(async (req, res) => {
  res.json(req.user);
}));

router.use(authRequired);

/* ============================== STATS =================================== */
router.get('/stats', wrap(async (req, res) => {
  const role = req.user.role;

  if (role === 'Admin') {
    const [[students]]    = await db.query('SELECT COUNT(*) AS c FROM students');
    const [[teachers]]    = await db.query('SELECT COUNT(*) AS c FROM teachers');
    const [[courses]]     = await db.query('SELECT COUNT(*) AS c FROM courses');
    const [[enrollments]] = await db.query('SELECT COUNT(*) AS c FROM enrollments');
    const [[users]]       = await db.query('SELECT COUNT(*) AS c FROM users');
    const [[classes]]     = await db.query('SELECT COUNT(*) AS c FROM classes');
    return res.json({
      students: students.c, teachers: teachers.c, courses: courses.c,
      enrollments: enrollments.c, users: users.c, classes: classes.c,
    });
  }

  if (role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json({ students: 0, courses: 0, enrollments: 0, classes: 0 });

    const [[students]]    = await db.query(`
      SELECT COUNT(DISTINCT e.student_id) AS c
      FROM enrollments e
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE cs.teacher_id = ?`, [teacherId]);
    const [[courses]]     = await db.query(
      'SELECT COUNT(*) AS c FROM class_subjects WHERE teacher_id = ?', [teacherId]);
    const [[enrollments]] = await db.query(`
      SELECT COUNT(*) AS c FROM enrollments e
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE cs.teacher_id = ?`, [teacherId]);
    const [[classes]]     = await db.query(
      'SELECT COUNT(DISTINCT class_id) AS c FROM class_subjects WHERE teacher_id = ?', [teacherId]);

    return res.json({
      students: students.c, teachers: 1, courses: courses.c,
      enrollments: enrollments.c, users: 0, classes: classes.c,
    });
  }

  const studentId = await getStudentId(req.user.user_id);
  if (!studentId) return res.json({ students: 0, teachers: 0, courses: 0, enrollments: 0, users: 0, classes: 0 });
  const [[enrollments]] = await db.query(
    'SELECT COUNT(*) AS c FROM enrollments WHERE student_id = ?', [studentId]);
  return res.json({
    students: 1, teachers: 0, courses: enrollments.c,
    enrollments: enrollments.c, users: 0, classes: 0,
  });
}));

/* ============================== STUDENTS ================================ */
router.get('/students', wrap(async (req, res) => {
  let sql = `
    SELECT s.student_id, s.user_id, s.name, s.email, s.age,
           p.profile_id, p.address, p.phone, p.bio, p.current_class_id,
           cl.class_name, u.username,
           (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.student_id) AS courses_count
    FROM students s
    LEFT JOIN student_profiles p ON p.student_id = s.student_id
    LEFT JOIN classes cl ON cl.class_id = p.current_class_id
    LEFT JOIN users u ON u.user_id = s.user_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    sql += ' WHERE s.user_id = ?';
    params.push(req.user.user_id);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ` WHERE s.student_id IN (
      SELECT DISTINCT e.student_id FROM enrollments e
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE cs.teacher_id = ?
    )`;
    params.push(teacherId);
  }

  sql += ' ORDER BY s.student_id DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.post('/students', requireRole('Admin'), wrap(async (req, res) => {
  const { name, email, age, address, phone, bio, current_class_id, username, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  if ((username && !password) || (password && !username)) {
    return res.status(400).json({ error: 'Both username and password are required to create a login.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let userId = null;

    if (username && password) {
      const [dupe] = await conn.query('SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]);
      if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
      const [roles] = await conn.query("SELECT role_id FROM roles WHERE role_name = 'Student' LIMIT 1");
      if (!roles.length) throw new Error("Role 'Student' not found.");
      const hash = await bcrypt.hash(password, 10);
      const [ur] = await conn.query(
        'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
        [username, hash, roles[0].role_id, 'active']
      );
      userId = ur.insertId;
    }

    const [r] = await conn.query(
      'INSERT INTO students (name, email, age, user_id) VALUES (?, ?, ?, ?)',
      [name, email, age ?? null, userId]
    );
    const sid = r.insertId;

    if (address || phone || bio || current_class_id) {
      await conn.query(
        'INSERT INTO student_profiles (student_id, address, phone, bio, current_class_id) VALUES (?, ?, ?, ?, ?)',
        [sid, address || null, phone || null, bio || null, current_class_id || null]
      );
    }
    await conn.commit();
    res.status(201).json({ student_id: sid, user_id: userId });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  } finally { conn.release(); }
}));

router.put('/students/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { id } = req.params;
  const { name, email, age, address, phone, bio, current_class_id, username, password } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT user_id FROM students WHERE student_id = ?', [id]);
    if (!existing.length) throw Object.assign(new Error('Student not found'), { status: 404 });
    let userId = existing[0].user_id;

    if (username || password) {
      if (!userId) {
        if (!username || !password) throw Object.assign(new Error('Both username and password required.'), { status: 400 });
        const [dupe] = await conn.query('SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]);
        if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
        const [roles] = await conn.query("SELECT role_id FROM roles WHERE role_name = 'Student' LIMIT 1");
        if (!roles.length) throw new Error("Role 'Student' not found.");
        const hash = await bcrypt.hash(password, 10);
        const [ur] = await conn.query(
          'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
          [username, hash, roles[0].role_id, 'active']
        );
        userId = ur.insertId;
      } else {
        if (username) {
          const [dupe] = await conn.query(
            'SELECT user_id FROM users WHERE username = ? AND user_id <> ? LIMIT 1',
            [username, userId]
          );
          if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
          await conn.query('UPDATE users SET username = ? WHERE user_id = ?', [username, userId]);
        }
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await conn.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
        }
      }
    }

    await conn.query(
      'UPDATE students SET name=?, email=?, age=?, user_id=? WHERE student_id=?',
      [name, email, age ?? null, userId, id]
    );

    const [ex] = await conn.query('SELECT profile_id FROM student_profiles WHERE student_id=?', [id]);
    if (ex.length) {
      await conn.query(
        'UPDATE student_profiles SET address=?, phone=?, bio=?, current_class_id=? WHERE student_id=?',
        [address || null, phone || null, bio || null, current_class_id || null, id]
      );
    } else if (address || phone || bio || current_class_id) {
      await conn.query(
        'INSERT INTO student_profiles (student_id, address, phone, bio, current_class_id) VALUES (?, ?, ?, ?, ?)',
        [id, address || null, phone || null, bio || null, current_class_id || null]
      );
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  } finally { conn.release(); }
}));

router.delete('/students/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { id } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM student_grades WHERE student_id=?', [id]);
    await conn.query('DELETE FROM attendance WHERE student_id=?', [id]);
    await conn.query('DELETE FROM enrollments WHERE student_id=?', [id]);
    await conn.query('DELETE FROM student_profiles WHERE student_id=?', [id]);
    await conn.query('DELETE FROM students WHERE student_id=?', [id]);
    await conn.commit();
    res.status(204).end();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

/* ============================== COURSES ================================= */
router.get('/courses', wrap(async (req, res) => {
  let sql = `
    SELECT c.course_id, c.title, c.credits, c.teacher_id,
           t.name AS teacher_name, t.subject,
           (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrolled
    FROM courses c
    LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE c.course_id IN (SELECT course_id FROM enrollments WHERE student_id = ?)';
    params.push(studentId);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE c.course_id IN (SELECT course_id FROM class_subjects WHERE teacher_id = ?)';
    params.push(teacherId);
  }

  sql += ' ORDER BY c.course_id';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.post('/courses', requireRole('Admin'), wrap(async (req, res) => {
  const { title, credits, teacher_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required.' });
  const [r] = await db.query(
    'INSERT INTO courses (title, credits, teacher_id) VALUES (?, ?, ?)',
    [title, credits || null, teacher_id || null]
  );
  res.status(201).json({ course_id: r.insertId });
}));

router.put('/courses/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { title, credits, teacher_id } = req.body;
  await db.query(
    'UPDATE courses SET title=?, credits=?, teacher_id=? WHERE course_id=?',
    [title, credits || null, teacher_id || null, req.params.id]
  );
  res.json({ ok: true });
}));

router.delete('/courses/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM courses WHERE course_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== TEACHERS ================================ */
router.get('/teachers', wrap(async (req, res) => {
  let sql = `
    SELECT t.teacher_id, t.user_id, t.name, t.email, t.subject, u.username,
           (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = t.teacher_id) AS courses_count
    FROM teachers t
    LEFT JOIN users u ON u.user_id = t.user_id
  `;
  const params = [];

  if (req.user.role === 'Teacher') {
    sql += ' WHERE t.user_id = ?';
    params.push(req.user.user_id);
  } else if (req.user.role === 'Student') {
    return res.json([]);
  }

  sql += ' ORDER BY t.teacher_id';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.post('/teachers', requireRole('Admin'), wrap(async (req, res) => {
  const { name, email, subject, username, password } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
  if ((username && !password) || (password && !username)) {
    return res.status(400).json({ error: 'Both username and password are required to create a login.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    let userId = null;

    if (username && password) {
      const [dupe] = await conn.query('SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]);
      if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
      const [roles] = await conn.query("SELECT role_id FROM roles WHERE role_name = 'Teacher' LIMIT 1");
      if (!roles.length) throw new Error("Role 'Teacher' not found.");
      const hash = await bcrypt.hash(password, 10);
      const [ur] = await conn.query(
        'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
        [username, hash, roles[0].role_id, 'active']
      );
      userId = ur.insertId;
    }

    const [r] = await conn.query(
      'INSERT INTO teachers (name, email, subject, user_id) VALUES (?, ?, ?, ?)',
      [name, email, subject || null, userId]
    );
    await conn.commit();
    res.status(201).json({ teacher_id: r.insertId, user_id: userId });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  } finally { conn.release(); }
}));

router.put('/teachers/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { id } = req.params;
  const { name, email, subject, username, password } = req.body;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT user_id FROM teachers WHERE teacher_id = ?', [id]);
    if (!existing.length) throw Object.assign(new Error('Teacher not found'), { status: 404 });
    let userId = existing[0].user_id;

    if (username || password) {
      if (!userId) {
        if (!username || !password) throw Object.assign(new Error('Both username and password required.'), { status: 400 });
        const [dupe] = await conn.query('SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]);
        if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
        const [roles] = await conn.query("SELECT role_id FROM roles WHERE role_name = 'Teacher' LIMIT 1");
        if (!roles.length) throw new Error("Role 'Teacher' not found.");
        const hash = await bcrypt.hash(password, 10);
        const [ur] = await conn.query(
          'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
          [username, hash, roles[0].role_id, 'active']
        );
        userId = ur.insertId;
      } else {
        if (username) {
          const [dupe] = await conn.query(
            'SELECT user_id FROM users WHERE username = ? AND user_id <> ? LIMIT 1',
            [username, userId]
          );
          if (dupe.length) throw Object.assign(new Error('Username already taken.'), { status: 409 });
          await conn.query('UPDATE users SET username = ? WHERE user_id = ?', [username, userId]);
        }
        if (password) {
          const hash = await bcrypt.hash(password, 10);
          await conn.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [hash, userId]);
        }
      }
    }

    await conn.query(
      'UPDATE teachers SET name=?, email=?, subject=?, user_id=? WHERE teacher_id=?',
      [name, email, subject || null, userId, id]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  } finally { conn.release(); }
}));

router.delete('/teachers/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM teachers WHERE teacher_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== ENROLLMENTS ============================= */
router.get('/enrollments', wrap(async (req, res) => {
  let sql = `
    SELECT e.enrollment_id, e.student_id, e.course_id, e.subject_id,
           e.grade, e.grade_points, e.enrolled_on,
           s.name AS student_name, c.title AS course_title, c.credits
    FROM enrollments e
    JOIN students s ON s.student_id = e.student_id
    JOIN courses  c ON c.course_id  = e.course_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE e.student_id = ?';
    params.push(studentId);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ` WHERE e.course_id IN (
      SELECT course_id FROM class_subjects WHERE teacher_id = ?
    )`;
    params.push(teacherId);
  }

  sql += ' ORDER BY e.enrolled_on DESC, e.enrollment_id DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));

router.post('/enrollments', requireRole('Admin'), wrap(async (req, res) => {
  const { student_id, course_id, subject_id, grade } = req.body;
  if (!student_id || !course_id) return res.status(400).json({ error: 'student_id and course_id required.' });
  const [dupe] = await db.query('SELECT enrollment_id FROM enrollments WHERE student_id=? AND course_id=?', [student_id, course_id]);
  if (dupe.length) return res.status(409).json({ error: 'Already enrolled in that course.' });
  const [r] = await db.query(
    'INSERT INTO enrollments (student_id, course_id, subject_id, grade, enrolled_on) VALUES (?, ?, ?, ?, CURDATE())',
    [student_id, course_id, subject_id || null, grade || null]
  );
  res.status(201).json({ enrollment_id: r.insertId });
}));

router.put('/enrollments/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { student_id, course_id, subject_id, grade } = req.body;
  await db.query(
    'UPDATE enrollments SET student_id=?, course_id=?, subject_id=?, grade=? WHERE enrollment_id=?',
    [student_id, course_id, subject_id || null, grade || null, req.params.id]
  );
  res.json({ ok: true });
}));

router.delete('/enrollments/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM enrollments WHERE enrollment_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== ROLES =================================== */
router.get('/roles', requireRole('Admin'), wrap(async (req, res) => {
  const [rows] = await db.query(`
    SELECT r.role_id, r.role_name,
           (SELECT COUNT(*) FROM users u WHERE u.role_id = r.role_id) AS users_count
    FROM roles r ORDER BY r.role_id
  `);
  res.json(rows);
}));
router.post('/roles', requireRole('Admin'), wrap(async (req, res) => {
  const { role_name } = req.body;
  if (!role_name) return res.status(400).json({ error: 'role_name required.' });
  const [r] = await db.query('INSERT INTO roles (role_name) VALUES (?)', [role_name]);
  res.status(201).json({ role_id: r.insertId });
}));
router.put('/roles/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('UPDATE roles SET role_name=? WHERE role_id=?', [req.body.role_name, req.params.id]);
  res.json({ ok: true });
}));
router.delete('/roles/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM roles WHERE role_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== USERS =================================== */
router.get('/users', requireRole('Admin'), wrap(async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.user_id, u.username, u.role_id, u.status, u.created_at, r.role_name
    FROM users u LEFT JOIN roles r ON r.role_id = u.role_id
    ORDER BY u.user_id DESC
  `);
  res.json(rows);
}));
router.post('/users', requireRole('Admin'), wrap(async (req, res) => {
  const { username, password, role_id, status } = req.body;
  if (!username || !password || !role_id) return res.status(400).json({ error: 'username, password, role_id required.' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query(
    'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
    [username, hash, role_id, status || 'active']
  );
  res.status(201).json({ user_id: r.insertId });
}));
router.put('/users/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { username, password, role_id, status } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      'UPDATE users SET username=?, password_hash=?, role_id=?, status=? WHERE user_id=?',
      [username, hash, role_id, status || 'active', req.params.id]
    );
  } else {
    await db.query(
      'UPDATE users SET username=?, role_id=?, status=? WHERE user_id=?',
      [username, role_id, status || 'active', req.params.id]
    );
  }
  res.json({ ok: true });
}));
router.delete('/users/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM users WHERE user_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ========================== ACADEMIC YEARS ============================== */
router.get('/academic-years', requireRole('Admin'), wrap(async (req, res) => {
  const [rows] = await db.query(`
    SELECT y.year_id, y.year_name, y.is_current,
           (SELECT COUNT(*) FROM classes c WHERE c.year_id = y.year_id) AS classes_count
    FROM academic_years y ORDER BY y.year_id DESC
  `);
  res.json(rows);
}));
router.post('/academic-years', requireRole('Admin'), wrap(async (req, res) => {
  const { year_name, is_current } = req.body;
  if (!year_name) return res.status(400).json({ error: 'year_name required.' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (is_current) await conn.query('UPDATE academic_years SET is_current = FALSE');
    const [r] = await conn.query(
      'INSERT INTO academic_years (year_name, is_current) VALUES (?, ?)',
      [year_name, is_current ? 1 : 0]
    );
    await conn.commit();
    res.status(201).json({ year_id: r.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.put('/academic-years/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { year_name, is_current } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (is_current) await conn.query('UPDATE academic_years SET is_current = FALSE');
    await conn.query(
      'UPDATE academic_years SET year_name=?, is_current=? WHERE year_id=?',
      [year_name, is_current ? 1 : 0, req.params.id]
    );
    await conn.commit();
    res.json({ ok: true });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.delete('/academic-years/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM academic_years WHERE year_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== CLASSES ================================= */
router.get('/classes', wrap(async (req, res) => {
  let sql = `
    SELECT c.class_id, c.class_name, c.year_id, y.year_name,
           (SELECT COUNT(*) FROM class_subjects cs WHERE cs.class_id = c.class_id) AS subjects_count,
           (SELECT COUNT(*) FROM student_profiles p WHERE p.current_class_id = c.class_id) AS students_count
    FROM classes c
    LEFT JOIN academic_years y ON y.year_id = c.year_id
  `;
  const params = [];

  if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE c.class_id IN (SELECT class_id FROM class_subjects WHERE teacher_id = ?)';
    params.push(teacherId);
  } else if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE c.class_id = (SELECT current_class_id FROM student_profiles WHERE student_id = ?)';
    params.push(studentId);
  }

  sql += ' ORDER BY c.class_id';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));
router.post('/classes', requireRole('Admin'), wrap(async (req, res) => {
  const { class_name, year_id } = req.body;
  if (!class_name) return res.status(400).json({ error: 'class_name required.' });
  const [r] = await db.query(
    'INSERT INTO classes (class_name, year_id) VALUES (?, ?)',
    [class_name, year_id || null]
  );
  res.status(201).json({ class_id: r.insertId });
}));
router.put('/classes/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { class_name, year_id } = req.body;
  await db.query('UPDATE classes SET class_name=?, year_id=? WHERE class_id=?',
    [class_name, year_id || null, req.params.id]);
  res.json({ ok: true });
}));
router.delete('/classes/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM classes WHERE class_id=?', [req.params.id]);
  res.status(204).end();
}));

/* =========================== CLASS SUBJECTS ============================= */
router.get('/class-subjects', wrap(async (req, res) => {
  let sql = `
    SELECT cs.subject_id, cs.class_id, cs.course_id, cs.teacher_id,
           c.class_name, co.title AS course_title, co.credits, t.name AS teacher_name
    FROM class_subjects cs
    LEFT JOIN classes c  ON c.class_id   = cs.class_id
    LEFT JOIN courses co ON co.course_id = cs.course_id
    LEFT JOIN teachers t ON t.teacher_id = cs.teacher_id
  `;
  const params = [];

  if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE cs.teacher_id = ?';
    params.push(teacherId);
  } else if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE cs.course_id IN (SELECT course_id FROM enrollments WHERE student_id = ?)';
    params.push(studentId);
  }

  sql += ' ORDER BY cs.subject_id DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));
router.post('/class-subjects', requireRole('Admin'), wrap(async (req, res) => {
  const { class_id, course_id, teacher_id } = req.body;
  if (!class_id || !course_id || !teacher_id) return res.status(400).json({ error: 'All fields required.' });
  try {
    const [r] = await db.query(
      'INSERT INTO class_subjects (class_id, course_id, teacher_id) VALUES (?, ?, ?)',
      [class_id, course_id, teacher_id]
    );
    res.status(201).json({ subject_id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This class already has that course assigned.' });
    throw e;
  }
}));
router.put('/class-subjects/:id', requireRole('Admin'), wrap(async (req, res) => {
  const { class_id, course_id, teacher_id } = req.body;
  await db.query(
    'UPDATE class_subjects SET class_id=?, course_id=?, teacher_id=? WHERE subject_id=?',
    [class_id, course_id, teacher_id, req.params.id]
  );
  res.json({ ok: true });
}));
router.delete('/class-subjects/:id', requireRole('Admin'), wrap(async (req, res) => {
  await db.query('DELETE FROM class_subjects WHERE subject_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================ ATTENDANCE ================================ */
router.get('/attendance', wrap(async (req, res) => {
  let sql = `
    SELECT a.attendance_id, a.student_id, a.subject_id, a.attendance_date, a.status, a.remarks,
           s.name AS student_name, c.class_name, co.title AS course_title
    FROM attendance a
    JOIN students s ON s.student_id = a.student_id
    LEFT JOIN class_subjects cs ON cs.subject_id = a.subject_id
    LEFT JOIN classes c  ON c.class_id   = cs.class_id
    LEFT JOIN courses co ON co.course_id = cs.course_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE a.student_id = ?';
    params.push(studentId);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE cs.teacher_id = ?';
    params.push(teacherId);
  }

  sql += ' ORDER BY a.attendance_date DESC, a.attendance_id DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));
router.post('/attendance', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { student_id, subject_id, attendance_date, status, remarks } = req.body;
  if (!student_id || !subject_id || !attendance_date || !status) return res.status(400).json({ error: 'Missing fields.' });
  if (req.user.role === 'Teacher' && !(await teacherOwnsSubject(req.user.user_id, subject_id))) {
    return res.status(403).json({ error: 'You do not teach that subject.' });
  }
  const [r] = await db.query(
    'INSERT INTO attendance (student_id, subject_id, attendance_date, status, remarks) VALUES (?, ?, ?, ?, ?)',
    [student_id, subject_id, attendance_date, status, remarks || null]
  );
  res.status(201).json({ attendance_id: r.insertId });
}));
router.put('/attendance/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { student_id, subject_id, attendance_date, status, remarks } = req.body;
  if (req.user.role === 'Teacher' && !(await teacherOwnsSubject(req.user.user_id, subject_id))) {
    return res.status(403).json({ error: 'You do not teach that subject.' });
  }
  await db.query(
    'UPDATE attendance SET student_id=?, subject_id=?, attendance_date=?, status=?, remarks=? WHERE attendance_id=?',
    [student_id, subject_id, attendance_date, status, remarks || null, req.params.id]
  );
  res.json({ ok: true });
}));
router.delete('/attendance/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  if (req.user.role === 'Teacher') {
    const [row] = await db.query('SELECT subject_id FROM attendance WHERE attendance_id = ?', [req.params.id]);
    if (!row.length || !(await teacherOwnsSubject(req.user.user_id, row[0].subject_id))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
  }
  await db.query('DELETE FROM attendance WHERE attendance_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================ GRADE ITEMS =============================== */
router.get('/grade-items', wrap(async (req, res) => {
  let sql = `
    SELECT gi.item_id, gi.subject_id, gi.item_name, gi.max_points,
           c.class_name, co.title AS course_title,
           (SELECT COUNT(*) FROM student_grades sg WHERE sg.item_id = gi.item_id) AS grades_count
    FROM grade_items gi
    LEFT JOIN class_subjects cs ON cs.subject_id = gi.subject_id
    LEFT JOIN classes c  ON c.class_id   = cs.class_id
    LEFT JOIN courses co ON co.course_id = cs.course_id
  `;
  const params = [];

  if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE cs.teacher_id = ?';
    params.push(teacherId);
  } else if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ` WHERE gi.subject_id IN (
      SELECT cs.subject_id FROM class_subjects cs
      JOIN enrollments e ON e.course_id = cs.course_id
      WHERE e.student_id = ?
    )`;
    params.push(studentId);
  }

  sql += " ORDER BY gi.subject_id, FIELD(gi.item_name, 'Assignment', 'Mid Exam', 'Final Exam')";
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));
router.post('/grade-items', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { subject_id, item_name } = req.body;
  if (!subject_id || !item_name) return res.status(400).json({ error: 'subject_id and item_name are required.' });
  const expected = ITEM_DEFAULTS[item_name];
  if (expected === undefined) return res.status(400).json({ error: "item_name must be 'Assignment', 'Mid Exam', or 'Final Exam'." });
  if (req.user.role === 'Teacher' && !(await teacherOwnsSubject(req.user.user_id, subject_id))) {
    return res.status(403).json({ error: 'You do not teach that subject.' });
  }
  const [dupe] = await db.query('SELECT item_id FROM grade_items WHERE subject_id=? AND item_name=?', [subject_id, item_name]);
  if (dupe.length) return res.status(409).json({ error: `This subject already has a ${item_name}.` });
  const [r] = await db.query(
    'INSERT INTO grade_items (subject_id, item_name, max_points) VALUES (?, ?, ?)',
    [subject_id, item_name, expected]
  );
  res.status(201).json({ item_id: r.insertId });
}));
router.put('/grade-items/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { subject_id, item_name } = req.body;
  const expected = ITEM_DEFAULTS[item_name];
  if (expected === undefined) return res.status(400).json({ error: "item_name must be 'Assignment', 'Mid Exam', or 'Final Exam'." });
  if (req.user.role === 'Teacher') {
    const [old] = await db.query('SELECT subject_id FROM grade_items WHERE item_id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Not found.' });
    if (!(await teacherOwnsSubject(req.user.user_id, old[0].subject_id)) ||
        !(await teacherOwnsSubject(req.user.user_id, subject_id))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
  }
  await db.query(
    'UPDATE grade_items SET subject_id=?, item_name=?, max_points=? WHERE item_id=?',
    [subject_id, item_name, expected, req.params.id]
  );
  res.json({ ok: true });
}));
router.delete('/grade-items/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  if (req.user.role === 'Teacher') {
    const [row] = await db.query('SELECT subject_id FROM grade_items WHERE item_id = ?', [req.params.id]);
    if (!row.length || !(await teacherOwnsSubject(req.user.user_id, row[0].subject_id))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
  }
  await db.query('DELETE FROM grade_items WHERE item_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ========================== STUDENT GRADES ============================== */
router.get('/student-grades', wrap(async (req, res) => {
  let sql = `
    SELECT sg.grade_id, sg.student_id, sg.item_id, sg.points_earned, sg.graded_at,
           s.name AS student_name,
           gi.item_name, gi.max_points, gi.subject_id,
           ROUND((sg.points_earned / gi.max_points) * 100, 1) AS percentage,
           letter_from_pct(ROUND((sg.points_earned / gi.max_points) * 100, 1)) AS letter,
           c.class_name, co.title AS course_title
    FROM student_grades sg
    JOIN students s ON s.student_id = sg.student_id
    JOIN grade_items gi ON gi.item_id = sg.item_id
    LEFT JOIN class_subjects cs ON cs.subject_id = gi.subject_id
    LEFT JOIN classes c  ON c.class_id   = cs.class_id
    LEFT JOIN courses co ON co.course_id = cs.course_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    const studentId = await getStudentId(req.user.user_id);
    if (!studentId) return res.json([]);
    sql += ' WHERE sg.student_id = ?';
    params.push(studentId);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ' WHERE cs.teacher_id = ?';
    params.push(teacherId);
  }

  sql += ' ORDER BY sg.graded_at DESC, sg.grade_id DESC';
  const [rows] = await db.query(sql, params);
  res.json(rows);
}));
router.post('/student-grades', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { student_id, item_id, points_earned } = req.body;
  if (!student_id || !item_id || points_earned === undefined) {
    return res.status(400).json({ error: 'student_id, item_id, points_earned required.' });
  }
  const [gi] = await db.query('SELECT max_points, subject_id FROM grade_items WHERE item_id=?', [item_id]);
  if (!gi.length) return res.status(400).json({ error: 'Grade item not found.' });
  if (req.user.role === 'Teacher' && !(await teacherOwnsSubject(req.user.user_id, gi[0].subject_id))) {
    return res.status(403).json({ error: 'You do not teach that subject.' });
  }
  const pts = Number(points_earned);
  if (Number.isNaN(pts) || pts < 0 || pts > gi[0].max_points) {
    return res.status(400).json({ error: `Points must be between 0 and ${gi[0].max_points}.` });
  }
  try {
    const [r] = await db.query(
      'INSERT INTO student_grades (student_id, item_id, points_earned) VALUES (?, ?, ?)',
      [student_id, item_id, pts]
    );
    res.status(201).json({ grade_id: r.insertId });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This student already has a grade for that item.' });
    throw e;
  }
}));
router.put('/student-grades/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  const { student_id, item_id, points_earned } = req.body;
  const [gi] = await db.query('SELECT max_points, subject_id FROM grade_items WHERE item_id=?', [item_id]);
  if (!gi.length) return res.status(400).json({ error: 'Grade item not found.' });
  if (req.user.role === 'Teacher' && !(await teacherOwnsSubject(req.user.user_id, gi[0].subject_id))) {
    return res.status(403).json({ error: 'You do not teach that subject.' });
  }
  const pts = Number(points_earned);
  if (Number.isNaN(pts) || pts < 0 || pts > gi[0].max_points) {
    return res.status(400).json({ error: `Points must be between 0 and ${gi[0].max_points}.` });
  }
  await db.query(
    'UPDATE student_grades SET student_id=?, item_id=?, points_earned=? WHERE grade_id=?',
    [student_id, item_id, pts, req.params.id]
  );
  res.json({ ok: true });
}));
router.delete('/student-grades/:id', requireRole('Admin', 'Teacher'), wrap(async (req, res) => {
  if (req.user.role === 'Teacher') {
    const [row] = await db.query(`
      SELECT gi.subject_id FROM student_grades sg
      JOIN grade_items gi ON gi.item_id = sg.item_id
      WHERE sg.grade_id = ?`, [req.params.id]);
    if (!row.length || !(await teacherOwnsSubject(req.user.user_id, row[0].subject_id))) {
      return res.status(403).json({ error: 'Forbidden.' });
    }
  }
  await db.query('DELETE FROM student_grades WHERE grade_id=?', [req.params.id]);
  res.status(204).end();
}));

/* ============================== CGPA ==================================== */
router.get('/cgpa', wrap(async (req, res) => {
  let sql = `
    SELECT
      s.student_id, s.name, s.email,
      COALESCE(SUM(c.credits), 0)                    AS total_credits,
      COALESCE(SUM(e.grade_points * c.credits), 0)   AS quality_points,
      COUNT(e.enrollment_id)                         AS courses_total,
      SUM(CASE WHEN e.grade IS NOT NULL THEN 1 ELSE 0 END) AS courses_graded
    FROM students s
    LEFT JOIN enrollments e
      ON e.student_id = s.student_id AND e.grade IS NOT NULL
    LEFT JOIN courses c
      ON c.course_id = e.course_id
  `;
  const params = [];

  if (req.user.role === 'Student') {
    sql += ' WHERE s.user_id = ?';
    params.push(req.user.user_id);
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    if (!teacherId) return res.json([]);
    sql += ` WHERE s.student_id IN (
      SELECT DISTINCT e.student_id FROM enrollments e
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE cs.teacher_id = ?
    )`;
    params.push(teacherId);
  }

  sql += ' GROUP BY s.student_id, s.name, s.email ORDER BY s.name';

  const [rows] = await db.query(sql, params);
  const result = rows.map((r) => {
    const totalCredits  = Number(r.total_credits) || 0;
    const qualityPoints = Number(r.quality_points) || 0;
    return {
      student_id:      r.student_id,
      name:            r.name,
      email:           r.email,
      total_credits:   totalCredits,
      quality_points:  qualityPoints,
      courses_total:   Number(r.courses_total) || 0,
      courses_graded:  Number(r.courses_graded) || 0,
      cgpa: totalCredits > 0 ? Number((qualityPoints / totalCredits).toFixed(2)) : null,
    };
  });
  res.json(result);
}));

router.get('/students/:id/cgpa', wrap(async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'Student') {
    const [own] = await db.query('SELECT student_id FROM students WHERE user_id = ?', [req.user.user_id]);
    if (!own.length || own[0].student_id !== Number(id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } else if (req.user.role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    const [ok] = await db.query(`
      SELECT 1 FROM enrollments e
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE e.student_id = ? AND cs.teacher_id = ? LIMIT 1
    `, [id, teacherId]);
    if (!ok.length) return res.status(403).json({ error: 'Forbidden' });
  }

  const [courses] = await db.query(`
    SELECT
      e.enrollment_id,
      c.title   AS course_title,
      c.credits,
      e.grade,
      e.grade_points,
      e.enrolled_on,
      (e.grade_points * c.credits) AS quality_points
    FROM enrollments e
    JOIN courses c ON c.course_id = e.course_id
    WHERE e.student_id = ?
    ORDER BY e.enrolled_on DESC
  `, [id]);

  const graded = courses.filter(c => c.grade !== null && c.grade !== undefined);
  const totalCredits  = graded.reduce((s, c) => s + Number(c.credits || 0), 0);
  const qualityPoints = graded.reduce((s, c) => s + Number(c.quality_points || 0), 0);

  res.json({
    courses,
    total_credits:  totalCredits,
    quality_points: qualityPoints,
    cgpa: totalCredits > 0 ? Number((qualityPoints / totalCredits).toFixed(2)) : null,
  });
}));

/* ============================== REPORTS ================================= */

async function scopeForUser(req) {
  if (req.user.role === 'Student') {
    return { role: 'Student', studentId: await getStudentId(req.user.user_id) };
  }
  if (req.user.role === 'Teacher') {
    return { role: 'Teacher', teacherId: await getTeacherId(req.user.user_id) };
  }
  return { role: 'Admin' };
}

/* Dropdown data for report filters — role-scoped */
router.get('/reports/filters', wrap(async (req, res) => {
  const role = req.user.role;

  const [years]    = await db.query('SELECT year_id, year_name FROM academic_years ORDER BY year_id DESC');
  const [classes]  = await db.query('SELECT class_id, class_name FROM classes ORDER BY class_name');
  const [courses]  = await db.query('SELECT course_id, title FROM courses ORDER BY title');
  const [subjects] = await db.query(`
    SELECT cs.subject_id, c.class_name, co.title AS course_title, t.name AS teacher_name
    FROM class_subjects cs
    LEFT JOIN classes c  ON c.class_id   = cs.class_id
    LEFT JOIN courses co ON co.course_id = cs.course_id
    LEFT JOIN teachers t ON t.teacher_id = cs.teacher_id
    ORDER BY c.class_name, co.title
  `);

  let teachers = [], students = [];

  if (role === 'Admin') {
    [teachers] = await db.query('SELECT teacher_id, name FROM teachers ORDER BY name');
    [students] = await db.query('SELECT student_id, name FROM students ORDER BY name');
  } else if (role === 'Teacher') {
    const teacherId = await getTeacherId(req.user.user_id);
    [teachers] = await db.query('SELECT teacher_id, name FROM teachers WHERE teacher_id = ?', [teacherId]);
    [students] = await db.query(`
      SELECT DISTINCT s.student_id, s.name
      FROM students s
      JOIN enrollments e ON e.student_id = s.student_id
      JOIN class_subjects cs ON cs.course_id = e.course_id
      WHERE cs.teacher_id = ?
      ORDER BY s.name
    `, [teacherId]);
  } else {
    const studentId = await getStudentId(req.user.user_id);
    [students] = await db.query('SELECT student_id, name FROM students WHERE student_id = ?', [studentId]);
  }

  res.json({ years, classes, courses, subjects, teachers, students });
}));

/* Main report query — switches by :type */
router.get('/reports/:type', wrap(async (req, res) => {
  const { type } = req.params;
  const q = req.query;
  const scope = await scopeForUser(req);
  let sql = '';
  const params = [];

  /* ------------------------------ STUDENTS ------------------------------ */
  if (type === 'students') {
    sql = `
      SELECT s.student_id, s.name, s.email, s.age,
             p.address, p.phone, cl.class_name,
             (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = s.student_id) AS courses_count
      FROM students s
      LEFT JOIN student_profiles p ON p.student_id = s.student_id
      LEFT JOIN classes cl ON cl.class_id = p.current_class_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') { sql += ' AND s.student_id = ?'; params.push(scope.studentId); }
    else if (scope.role === 'Teacher') {
      sql += ` AND s.student_id IN (SELECT DISTINCT e.student_id FROM enrollments e JOIN class_subjects cs ON cs.course_id = e.course_id WHERE cs.teacher_id = ?)`;
      params.push(scope.teacherId);
    }
    if (q.class_id) { sql += ' AND p.current_class_id = ?'; params.push(Number(q.class_id)); }
    if (q.year_id)  { sql += ' AND cl.year_id = ?';        params.push(Number(q.year_id)); }
    if (q.search)   { sql += ' AND (s.name LIKE ? OR s.email LIKE ?)'; params.push(`%${q.search}%`, `%${q.search}%`); }
    sql += ' ORDER BY s.name';
  }

  /* ------------------------------ TEACHERS ------------------------------ */
  else if (type === 'teachers') {
    sql = `
      SELECT t.teacher_id, t.name, t.email, t.subject,
             (SELECT COUNT(*) FROM courses c WHERE c.teacher_id = t.teacher_id) AS courses_count,
             (SELECT COUNT(*) FROM class_subjects cs WHERE cs.teacher_id = t.teacher_id) AS subjects_count
      FROM teachers t WHERE 1=1
    `;
    if (scope.role === 'Teacher') { sql += ' AND t.teacher_id = ?'; params.push(scope.teacherId); }
    else if (scope.role === 'Student') return res.json({ type, rows: [] });
    if (q.subject) { sql += ' AND t.subject LIKE ?'; params.push(`%${q.subject}%`); }
    if (q.search)  { sql += ' AND (t.name LIKE ? OR t.email LIKE ?)'; params.push(`%${q.search}%`, `%${q.search}%`); }
    sql += ' ORDER BY t.name';
  }

  /* ------------------------------ COURSES ------------------------------- */
  else if (type === 'courses') {
    sql = `
      SELECT c.course_id, c.title, c.credits,
             t.name AS teacher_name, t.subject,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrolled
      FROM courses c LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') {
      sql += ' AND c.course_id IN (SELECT course_id FROM enrollments WHERE student_id = ?)';
      params.push(scope.studentId);
    } else if (scope.role === 'Teacher') {
      sql += ' AND c.course_id IN (SELECT course_id FROM class_subjects WHERE teacher_id = ?)';
      params.push(scope.teacherId);
    }
    if (q.teacher_id) { sql += ' AND c.teacher_id = ?'; params.push(Number(q.teacher_id)); }
    if (q.search)     { sql += ' AND c.title LIKE ?';   params.push(`%${q.search}%`); }
    sql += ' ORDER BY c.title';
  }

  /* --------------------------- ENROLLMENTS ------------------------------ */
  else if (type === 'enrollments') {
    sql = `
      SELECT e.enrollment_id, e.enrolled_on,
             s.name AS student_name, s.email AS student_email,
             c.title AS course_title, c.credits,
             e.grade, e.grade_points
      FROM enrollments e
      JOIN students s ON s.student_id = e.student_id
      JOIN courses  c ON c.course_id  = e.course_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') { sql += ' AND e.student_id = ?'; params.push(scope.studentId); }
    else if (scope.role === 'Teacher') {
      sql += ' AND e.course_id IN (SELECT course_id FROM class_subjects WHERE teacher_id = ?)';
      params.push(scope.teacherId);
    }
    if (q.student_id) { sql += ' AND e.student_id = ?'; params.push(Number(q.student_id)); }
    if (q.course_id)  { sql += ' AND e.course_id = ?';  params.push(Number(q.course_id)); }
    if (q.teacher_id) { sql += ' AND c.teacher_id = ?'; params.push(Number(q.teacher_id)); }
    if (q.class_id)   { sql += ' AND e.course_id IN (SELECT course_id FROM class_subjects WHERE class_id = ?)'; params.push(Number(q.class_id)); }
    if (q.grade)      { sql += ' AND e.grade = ?';       params.push(q.grade); }
    if (q.from)       { sql += ' AND e.enrolled_on >= ?'; params.push(q.from); }
    if (q.to)         { sql += ' AND e.enrolled_on <= ?'; params.push(q.to); }
    sql += ' ORDER BY e.enrolled_on DESC';
  }

  /* ---------------------------- ATTENDANCE ------------------------------ */
  else if (type === 'attendance') {
    sql = `
      SELECT a.attendance_id, a.attendance_date, a.status, a.remarks,
             s.name AS student_name,
             c.class_name, co.title AS course_title
      FROM attendance a
      JOIN students s ON s.student_id = a.student_id
      LEFT JOIN class_subjects cs ON cs.subject_id = a.subject_id
      LEFT JOIN classes c ON c.class_id = cs.class_id
      LEFT JOIN courses co ON co.course_id = cs.course_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') { sql += ' AND a.student_id = ?'; params.push(scope.studentId); }
    else if (scope.role === 'Teacher') { sql += ' AND cs.teacher_id = ?'; params.push(scope.teacherId); }
    if (q.student_id) { sql += ' AND a.student_id = ?'; params.push(Number(q.student_id)); }
    if (q.subject_id) { sql += ' AND a.subject_id = ?'; params.push(Number(q.subject_id)); }
    if (q.class_id)   { sql += ' AND cs.class_id = ?';  params.push(Number(q.class_id)); }
    if (q.teacher_id) { sql += ' AND cs.teacher_id = ?'; params.push(Number(q.teacher_id)); }
    if (q.status)     { sql += ' AND a.status = ?';     params.push(q.status); }
    if (q.from)       { sql += ' AND a.attendance_date >= ?'; params.push(q.from); }
    if (q.to)         { sql += ' AND a.attendance_date <= ?'; params.push(q.to); }
    sql += ' ORDER BY a.attendance_date DESC';
  }

  /* -------------------------- STUDENT GRADES ---------------------------- */
  else if (type === 'student-grades') {
    sql = `
      SELECT sg.grade_id, sg.points_earned, sg.graded_at,
             s.name AS student_name,
             gi.item_name, gi.max_points,
             ROUND((sg.points_earned / gi.max_points) * 100, 1) AS percentage,
             letter_from_pct(ROUND((sg.points_earned / gi.max_points) * 100, 1)) AS letter,
             c.class_name, co.title AS course_title
      FROM student_grades sg
      JOIN students s ON s.student_id = sg.student_id
      JOIN grade_items gi ON gi.item_id = sg.item_id
      LEFT JOIN class_subjects cs ON cs.subject_id = gi.subject_id
      LEFT JOIN classes c ON c.class_id = cs.class_id
      LEFT JOIN courses co ON co.course_id = cs.course_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') { sql += ' AND sg.student_id = ?'; params.push(scope.studentId); }
    else if (scope.role === 'Teacher') { sql += ' AND cs.teacher_id = ?'; params.push(scope.teacherId); }
    if (q.student_id) { sql += ' AND sg.student_id = ?'; params.push(Number(q.student_id)); }
    if (q.subject_id) { sql += ' AND gi.subject_id = ?'; params.push(Number(q.subject_id)); }
    if (q.course_id)  { sql += ' AND co.course_id = ?';  params.push(Number(q.course_id)); }
    if (q.teacher_id) { sql += ' AND cs.teacher_id = ?'; params.push(Number(q.teacher_id)); }
    if (q.class_id)   { sql += ' AND cs.class_id = ?';   params.push(Number(q.class_id)); }
    if (q.item_name)  { sql += ' AND gi.item_name = ?';  params.push(q.item_name); }
    if (q.from)       { sql += ' AND DATE(sg.graded_at) >= ?'; params.push(q.from); }
    if (q.to)         { sql += ' AND DATE(sg.graded_at) <= ?'; params.push(q.to); }
    sql += ' ORDER BY sg.graded_at DESC';
  }

  /* ------------------------------- CGPA --------------------------------- */
  else if (type === 'cgpa') {
    sql = `
      SELECT s.student_id, s.name, s.email,
        COALESCE(SUM(c.credits), 0) AS total_credits,
        COALESCE(SUM(e.grade_points * c.credits), 0) AS quality_points,
        COUNT(e.enrollment_id) AS courses_total,
        SUM(CASE WHEN e.grade IS NOT NULL THEN 1 ELSE 0 END) AS courses_graded
      FROM students s
      LEFT JOIN enrollments e ON e.student_id = s.student_id AND e.grade IS NOT NULL
      LEFT JOIN courses c ON c.course_id = e.course_id
      WHERE 1=1
    `;
    if (scope.role === 'Student') { sql += ' AND s.student_id = ?'; params.push(scope.studentId); }
    else if (scope.role === 'Teacher') {
      sql += ` AND s.student_id IN (SELECT DISTINCT e.student_id FROM enrollments e JOIN class_subjects cs ON cs.course_id = e.course_id WHERE cs.teacher_id = ?)`;
      params.push(scope.teacherId);
    }
    if (q.class_id) { sql += ' AND s.student_id IN (SELECT student_id FROM student_profiles WHERE current_class_id = ?)'; params.push(Number(q.class_id)); }
    sql += ' GROUP BY s.student_id, s.name, s.email';
    sql += ' ORDER BY (quality_points / NULLIF(total_credits, 0)) DESC';

    const [rows] = await db.query(sql, params);
    const out = rows.map(r => {
      const tc = Number(r.total_credits) || 0;
      const qp = Number(r.quality_points) || 0;
      return {
        student_id: r.student_id, name: r.name, email: r.email,
        total_credits: tc, quality_points: qp,
        courses_total: Number(r.courses_total) || 0,
        courses_graded: Number(r.courses_graded) || 0,
        cgpa: tc > 0 ? Number((qp / tc).toFixed(2)) : null,
      };
    });
    const min = q.min != null && q.min !== '' ? Number(q.min) : null;
    const max = q.max != null && q.max !== '' ? Number(q.max) : null;
    const filtered = out.filter(r => {
      if (r.cgpa == null) return false;
      if (min != null && r.cgpa < min) return false;
      if (max != null && r.cgpa > max) return false;
      return true;
    });
    return res.json({ type, rows: filtered });
  }

  else return res.status(400).json({ error: `Unknown report type: ${type}` });

  const [rows] = await db.query(sql, params);
  res.json({ type, rows });
}));

module.exports = router;