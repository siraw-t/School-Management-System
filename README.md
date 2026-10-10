# EduPanel — School Management System

A full-stack school management platform for Ethiopian secondary schools. Built with **React + Vite** on the frontend and **Express + MySQL** on the backend, featuring role-based access control, automated grade computation, CGPA tracking, and printable/exportable reports.

![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646cff?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node-20.x-339933?logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Default Accounts](#default-accounts)
- [Roles & Permissions](#roles--permissions)
- [Grading System](#grading-system)
- [CGPA Calculation](#cgpa-calculation)
- [Reports](#reports)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core
- 🔐 **JWT Authentication** — Secure login with bcrypt-hashed passwords and 7-day tokens
- 👥 **Role-Based Access Control** — Admin, Teacher, Student roles with per-page and per-row filtering
- 📱 **Fully Responsive** — Sidebar collapses to a drawer on mobile; tables become cards
- 🎨 **Animated UI** — Framer Motion transitions on every page, hover states, and count-up stats

### Academic Management
- **Students** — Full profile, class assignment, optional linked login account
- **Teachers** — Subject, assigned courses and class subjects, optional linked login
- **Courses** — Title, credits, assigned teacher
- **Classes** — Grade sections tied to academic years
- **Class Subjects** — The join table linking class + course + teacher
- **Academic Years** — Multi-year support with "current year" toggle
- **Enrollments** — Auto-computed grade and grade points from student scores

### Grades & Attendance
- **Grade Items** — Exactly 3 per subject: Assignment (30), Mid Exam (30), Final Exam (40)
- **Student Grades** — Auto-calculated letter grade (A+ through F) and grade points
- **Auto-Update Triggers** — Enrollment grades recalculate automatically when student grades change
- **Attendance** — Present / Absent / Late / Excused with remarks
- **CGPA** — Weighted by course credits, live-computed, with honors classification

### Reports
- 7 report types: Students, Teachers, Courses, Enrollments, Attendance, Student Grades, CGPA
- Filters by year, class, course, teacher, student, subject, dates, grade, status
- Export to **Print**, **PDF**, **Excel**, **CSV**, **JSON**
- Role-scoped: teachers see only their students, students see only themselves

---

## Tech Stack

**Frontend**
- React 18
- Vite 8
- React Router v6
- Framer Motion
- Inline CSS + `theme.js` design tokens

**Backend**
- Node.js + Express 4
- MySQL 8 (via `mysql2` promise pool)
- bcryptjs for password hashing
- jsonwebtoken for JWT auth

**Database**
- MySQL 8 with:
  - Foreign key constraints (cascade deletes where appropriate)
  - Stored functions: `letter_from_pct`, `points_from_letter`
  - Stored procedure: `recalc_enrollment_grade`
  - Triggers: `trg_sg_ai`, `trg_sg_au`, `trg_sg_ad`

---

## Project Structure

```
edupanel/
├── index.html                  # Vite entry HTML
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite config + API proxy
├── .gitignore
├── README.md
│
├── src/                        # React frontend
│   ├── main.jsx
│   ├── App.jsx                 # Routes + role guards
│   ├── api.js                  # Fetch wrapper with token handling
│   ├── theme.js                # Design tokens (colors, cards, buttons)
│   ├── hooks.js                # useResponsive, useHover, useCan
│   ├── permissions.js          # Role → capability map
│   │
│   ├── context/
│   │   └── AuthContext.jsx     # Session (sessionStorage + localStorage)
│   │
│   ├── components/
│   │   ├── Layout.jsx          # Sidebar, mobile drawer, user chip
│   │   ├── ProtectedRoute.jsx  # Requires any authenticated user
│   │   ├── RequireRole.jsx     # Requires specific role(s)
│   │   ├── Page.jsx            # Page header wrapper
│   │   ├── Modal.jsx           # Animated modal
│   │   ├── StatCard.jsx        # Count-up stat
│   │   ├── Avatar.jsx          # Initials avatar
│   │   ├── Icon.jsx            # Inline SVG icons
│   │   ├── Skeleton.jsx        # Loading shimmer
│   │   ├── EditBtn.jsx         # Reusable edit button
│   │   └── GlobalStyles.jsx    # Global CSS reset + keyframes
│   │
│   └── pages/
│       ├── Login.jsx
│       ├── Dashboard.jsx
│       ├── Students.jsx
│       ├── Teachers.jsx
│       ├── Courses.jsx
│       ├── Classes.jsx
│       ├── ClassSubjects.jsx
│       ├── Enrollments.jsx
│       ├── Attendance.jsx
│       ├── GradeItems.jsx
│       ├── StudentGrades.jsx
│       ├── AcademicYears.jsx
│       ├── Users.jsx
│       ├── Roles.jsx
│       ├── CGPA.jsx
│       └── Reports.jsx
│
└── server/                     # Express backend
    ├── package.json
    ├── .env.example
    ├── index.js                # App entry + seed roles/admin
    ├── db.js                   # MySQL connection pool
    ├── reset-passwords.js      # Utility: re-hash all user passwords
    ├── seed-ethiopia.sql       # Sample data (Ethiopian curriculum)
    ├── migrate-grades.sql      # Grade system schema (functions, triggers)
    └── routes/
        └── api.js              # All API endpoints
```

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or newer — https://nodejs.org
- **MySQL** 8.x — via XAMPP, WAMP, MAMP, or native install
- **MySQL Workbench** (recommended) or any MySQL client
- **Git** — https://git-scm.com

Verify:

```bash
node --version    # v18+
npm --version
mysql --version   # 8.x
```

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/edupanel.git
cd edupanel
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd server
npm install
cd ..
```

### 4. Set up environment variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env` with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=school_db
PORT=5000
JWT_SECRET=change-this-to-a-long-random-string
```

---

## Database Setup

### 1. Create the database

In MySQL Workbench or the CLI:

```sql
CREATE DATABASE school_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Create the tables

Run this in the new `school_db`:

```sql
USE school_db;

CREATE TABLE roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE academic_years (
  year_id INT AUTO_INCREMENT PRIMARY KEY,
  year_name VARCHAR(20) NOT NULL,
  is_current BOOLEAN DEFAULT FALSE
);

CREATE TABLE classes (
  class_id INT AUTO_INCREMENT PRIMARY KEY,
  class_name VARCHAR(50) NOT NULL,
  year_id INT,
  FOREIGN KEY (year_id) REFERENCES academic_years(year_id)
);

CREATE TABLE teachers (
  teacher_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE courses (
  course_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  credits INT,
  teacher_id INT,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL
);

CREATE TABLE class_subjects (
  subject_id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  course_id INT NOT NULL,
  teacher_id INT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
  UNIQUE (class_id, course_id)
);

CREATE TABLE students (
  student_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  age INT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE student_profiles (
  profile_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNIQUE,
  address VARCHAR(255),
  phone VARCHAR(30),
  bio TEXT,
  current_class_id INT,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (current_class_id) REFERENCES classes(class_id) ON DELETE SET NULL
);

CREATE TABLE enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  subject_id INT,
  grade VARCHAR(3),
  grade_points DECIMAL(4,2),
  enrolled_on DATE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES class_subjects(subject_id) ON DELETE SET NULL,
  UNIQUE (student_id, course_id)
);

CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present','Absent','Late','Excused') NOT NULL,
  remarks VARCHAR(255),
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES class_subjects(subject_id) ON DELETE CASCADE
);

CREATE TABLE grade_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  subject_id INT NOT NULL,
  item_name VARCHAR(50) NOT NULL,
  max_points INT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES class_subjects(subject_id) ON DELETE CASCADE,
  UNIQUE (subject_id, item_name)
);

CREATE TABLE student_grades (
  grade_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  item_id INT NOT NULL,
  points_earned DECIMAL(5,2) NOT NULL,
  graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES grade_items(item_id) ON DELETE CASCADE,
  UNIQUE (student_id, item_id)
);
```

### 3. Install grade-system helpers (functions, procedure, triggers)

Run `server/migrate-grades.sql` in Workbench. It creates:

- `letter_from_pct(percentage)` — returns letter grade
- `points_from_letter(letter)` — returns grade points
- `recalc_enrollment_grade(student_id, item_id)` — recomputes enrollment
- Triggers on `student_grades` that call the procedure

### 4. Seed sample Ethiopian curriculum data (optional)

Run `server/seed-ethiopia.sql` to populate:

- 1 academic year: `2026/2027`
- 4 classes: Grade 9A, 9B, 10A, 10B
- 10 teachers + 10 courses (English, Amharic, Math, Bio, Chem, Physics, Geo, History, Civics, ICT)
- 8 students + enrollments across subjects
- 120 grade items + 54 sample grades
- 20 attendance records

### 5. Hash the seeded passwords

Since SQL cannot hash bcrypt values, run the reset utility:

```bash
cd server
node reset-passwords.js
```

This sets every user's password to `siraw@12` with a proper bcrypt hash.

---

## Running the App

You need **two terminals open at the same time**.

### Terminal 1 — Backend

```bash
cd server
node index.js
```

Expected output:

```
✅ Seeded roles
✅ Seeded admin user
✅ API running on http://localhost:5000
```

### Terminal 2 — Frontend

```bash
npm run dev
```

Expected output:

```
  VITE v8.x.x  ready
  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Default Accounts

After running `reset-passwords.js`, all accounts share the password **`siraw@12`**.

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `siraw@12` |
| Teacher | `teacher_english` | `siraw@12` |
| Teacher | `teacher_amharic` | `siraw@12` |
| Teacher | `teacher_math` | `siraw@12` |
| Teacher | `teacher_biology` | `siraw@12` |
| Teacher | `teacher_chem` | `siraw@12` |
| Teacher | `teacher_physics` | `siraw@12` |
| Teacher | `teacher_geography` | `siraw@12` |
| Teacher | `teacher_history` | `siraw@12` |
| Teacher | `teacher_civics` | `siraw@12` |
| Teacher | `teacher_ict` | `siraw@12` |
| Student | `student_abebe` | `siraw@12` |
| Student | `student_tigist` | `siraw@12` |
| Student | `student_dawit` | `siraw@12` |
| Student | `student_hana` | `siraw@12` |
| Student | `student_yohannes` | `siraw@12` |
| Student | `student_meron` | `siraw@12` |
| Student | `student_solomon` | `siraw@12` |
| Student | `student_bethelhem` | `siraw@12` |

> Change these before deploying to production.

---

## Roles & Permissions

### Admin
- Full access to every page and every record
- Manages users, roles, teachers, students, classes, courses, enrollments
- Can create/delete anything

### Teacher
- **Sees:** Dashboard, Students, Courses, Classes, Class Subjects, Enrollments, Attendance, Grade Items, Student Grades, CGPA, Reports
- **Sees data for:** only students enrolled in their own class subjects
- **Can write:** Attendance, Grade Items, Student Grades — only for subjects they teach
- **Cannot:** create students, teachers, courses, classes, users, or roles

### Student
- **Sees:** Dashboard, Courses, Classes, Class Subjects, Enrollments, Attendance, Student Grades, CGPA, Reports
- **Sees data for:** only themselves
- **Can write:** nothing (read-only)
- **Cannot:** access Users, Roles, Academic Years, Teachers, or any write action

---

## Grading System

### Letter scale

| Percentage | Letter | Grade Points |
|:----------:|:------:|:------------:|
| 90–100 | A+ | 4.00 |
| 85–89 | A | 4.00 |
| 80–84 | A- | 3.75 |
| 75–79 | B+ | 3.50 |
| 70–74 | B | 3.00 |
| 65–69 | B- | 2.75 |
| 60–64 | C | 2.00 |
| 50–59 | D | 1.00 |
| below 50 | F | 0.00 |

### Assessment structure

Each class subject has exactly **3 grade items**:

| Item | Max Points |
|------|:----------:|
| Assignment | 30 |
| Mid Exam | 30 |
| Final Exam | 40 |
| **Total** | **100** |

When all 3 assessments are entered for a student, the enrollment's `grade` and `grade_points` update automatically via SQL triggers.

---

## CGPA Calculation

```
CGPA = Σ(grade_points × course_credits) / Σ(course_credits)
```

Only graded enrollments count. In-progress enrollments (`grade IS NULL`) are skipped.

**Example:**

| Course | Credits | Grade | Points | Weighted |
|--------|:-------:|:-----:|:------:|:--------:|
| English | 4 | A+ | 4.00 | 16.00 |
| Amharic | 3 | B+ | 3.50 | 10.50 |
| Math | 4 | A | 4.00 | 16.00 |
| **Total** | **11** | | | **42.50** |

CGPA = 42.50 / 11 = **3.86**

### Honors classification

| CGPA | Label |
|:----:|-------|
| 3.75 – 4.00 | Summa Cum Laude |
| 3.50 – 3.74 | Magna Cum Laude |
| 3.00 – 3.49 | Cum Laude |
| 2.00 – 2.99 | Satisfactory |
| 1.00 – 1.99 | On Probation |
| below 1.00 | At Risk |

---

## Reports

Seven report types, all filterable and exportable.

| Report | Filters |
|--------|---------|
| Students | Year, Class, Search |
| Teachers | Search |
| Courses | Teacher, Search |
| Enrollments | Student, Course, Teacher, Class, Grade, Date range |
| Attendance | Student, Class Subject, Teacher, Class, Status, Date range |
| Student Grades | Student, Class Subject, Course, Teacher, Class, Assessment, Date range |
| CGPA | Class, Min CGPA, Max CGPA |

### Export formats

- **Print** — opens browser print dialog with clean layout
- **PDF** — same dialog, choose "Save as PDF"
- **Excel** — downloads `.xls` (opens in Excel, Numbers, LibreOffice)
- **CSV** — downloads `.csv`
- **JSON** — downloads machine-readable `.json`

All exports respect the currently-applied filters.

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Path | Access |
|--------|------|--------|
| POST | `/auth/login` | Public |
| GET | `/auth/me` | Any authenticated |

### Core

| Method | Path | Access |
|--------|------|--------|
| GET | `/stats` | Any (role-scoped) |
| GET | `/students` | Any (role-scoped) |
| POST/PUT/DELETE | `/students/:id?` | Admin |
| GET | `/teachers` | Any (role-scoped) |
| POST/PUT/DELETE | `/teachers/:id?` | Admin |
| GET | `/courses` | Any (role-scoped) |
| POST/PUT/DELETE | `/courses/:id?` | Admin |
| GET | `/classes` | Any (role-scoped) |
| POST/PUT/DELETE | `/classes/:id?` | Admin |
| GET | `/class-subjects` | Any (role-scoped) |
| POST/PUT/DELETE | `/class-subjects/:id?` | Admin |
| GET | `/enrollments` | Any (role-scoped) |
| POST/PUT/DELETE | `/enrollments/:id?` | Admin |
| GET | `/attendance` | Any (role-scoped) |
| POST/PUT/DELETE | `/attendance/:id?` | Admin, Teacher (own subjects) |
| GET | `/grade-items` | Any (role-scoped) |
| POST/PUT/DELETE | `/grade-items/:id?` | Admin, Teacher (own subjects) |
| GET | `/student-grades` | Any (role-scoped) |
| POST/PUT/DELETE | `/student-grades/:id?` | Admin, Teacher (own subjects) |
| GET | `/cgpa` | Any (role-scoped) |
| GET | `/students/:id/cgpa` | Any (role-scoped) |
| GET | `/reports/filters` | Any (role-scoped) |
| GET | `/reports/:type` | Any (role-scoped) |
| GET | `/roles` | Admin |
| GET | `/users` | Admin |
| GET | `/academic-years` | Admin |

All POST/PUT/DELETE except where noted require `Authorization: Bearer <token>`.

---

## Environment Variables

### `server/.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `school_db` |
| `PORT` | Backend server port | `5000` |
| `JWT_SECRET` | Secret used to sign tokens | long random string |

**Never commit `.env`.** Use `server/.env.example` as a template.

---

## Scripts

### Frontend (root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |

### Backend (`server/`)

| Command | Description |
|---------|-------------|
| `node index.js` | Start the API server on port 5000 |
| `node reset-passwords.js` | Re-hash all user passwords |
| `node seed-students.js` | (optional) Seed extra students with hashed passwords |

---

## Contributing

1. Fork the repo
2. Create a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes
   ```bash
   git commit -m "Add amazing feature"
   ```
4. Push to the branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a Pull Request

Please follow the existing code style — inline styles for JSX, `theme.js` for tokens, `useCan()` for role checks.

---

## License

Distributed under the MIT License. See `LICENSE` for details.

---

## Acknowledgements

- Ethiopian Ministry of Education — Grade 9/10 General Secondary Curriculum structure
- [Framer Motion](https://www.framer.com/motion/) — animations
- [Express](https://expressjs.com/) — backend framework
- [Vite](https://vitejs.dev/) — build tool

---

## Contact

**Your Name** — [@yourhandle](https://github.com/yourhandle) — you@example.com

Project Link: [https://github.com/YOUR_USERNAME/edupanel](https://github.com/YOUR_USERNAME/edupanel)
