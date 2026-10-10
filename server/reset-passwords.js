require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

const NEW_PASSWORD = 'siraw@12';

async function run() {
  console.log('Connecting to MySQL...');
  await db.query('SELECT 1');
  console.log('✅ Connected\n');

  // 1. Show every user + their role before the update
  const [users] = await db.query(`
    SELECT u.user_id, u.username, r.role_name
    FROM users u
    LEFT JOIN roles r ON r.role_id = u.role_id
    ORDER BY u.user_id
  `);

  if (users.length === 0) {
    console.log('⚠️  No users found. Run your seed SQL first.');
    process.exit(1);
  }

  console.log('Users in DB:');
  users.forEach(u =>
    console.log(`  #${String(u.user_id).padEnd(3)}  ${u.username.padEnd(22)} (${u.role_name || 'no role'})`)
  );
  console.log();

  // 2. Hash the password once, apply to every user
  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  const [r] = await db.query('UPDATE users SET password_hash = ?', [hash]);

  console.log(`✅ Reset ${r.affectedRows} user(s) to password: ${NEW_PASSWORD}\n`);

  // 3. Print credentials table
  console.log('─────────────────────────────────────────────────────────');
  console.log('  LOGIN CREDENTIALS');
  console.log('─────────────────────────────────────────────────────────');
  console.log('  Username                Password');
  console.log('  ────────────────────    ────────────');
  users.forEach(u => console.log(`  ${u.username.padEnd(22)}  ${NEW_PASSWORD}`));
  console.log('─────────────────────────────────────────────────────────');
  console.log('\nAll passwords above are bcrypt-hashed in the DB.');
  console.log('Verify with:  SELECT username, LEFT(password_hash, 7) FROM users;');
  console.log('');

  process.exit(0);
}

run().catch(e => {
  console.error('\n❌ Failed:', e.message);
  console.error('\nCheck .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
  process.exit(1);
});