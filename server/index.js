require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const db = require('./db');
const api = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

async function seed() {
  try {
    const [roles] = await db.query('SELECT COUNT(*) AS c FROM roles');
    if (roles[0].c === 0) {
      await db.query(
        "INSERT INTO roles (role_name) VALUES ('admin'), ('teacher'), ('student')"
      );
      console.log('✅ Seeded roles');
    }
    const [users] = await db.query('SELECT COUNT(*) AS c FROM users');
    if (users[0].c === 0) {
      const [adminRole] = await db.query("SELECT role_id FROM roles WHERE role_name='admin' LIMIT 1");
      const hash = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO users (username, password_hash, role_id, status) VALUES (?, ?, ?, ?)',
        ['admin', hash, adminRole[0].role_id, 'active']
      );
      console.log('✅ Seeded admin user  →  username: admin  password: admin123');
    }
  } catch (e) {
    console.error('⚠️  Seed skipped:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  await seed();
  console.log(`✅ API running on http://localhost:${PORT}`);
});