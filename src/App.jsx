import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RequireRole from './components/RequireRole';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Courses from './pages/Courses';
import Teachers from './pages/Teachers';
import Enrollments from './pages/Enrollments';
import Classes from './pages/Classes';
import ClassSubjects from './pages/ClassSubjects';
import Attendance from './pages/Attendance';
import GradeItems from './pages/GradeItems';
import StudentGrades from './pages/StudentGrades';
import AcademicYears from './pages/AcademicYears';
import Users from './pages/Users';
import Roles from './pages/Roles';
import CGPA from './pages/CGPA';
import Reports from './pages/Reports';


const A   = ['Admin'];
const AT  = ['Admin', 'Teacher'];
const ATS = ['Admin', 'Teacher', 'Student'];

export default function App() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const shell = (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/"                element={<RequireRole roles={ATS}><Dashboard /></RequireRole>} />
        <Route path="/students"        element={<RequireRole roles={AT}><Students /></RequireRole>} />
        <Route path="/teachers"        element={<RequireRole roles={A}><Teachers /></RequireRole>} />
        <Route path="/courses"         element={<RequireRole roles={ATS}><Courses /></RequireRole>} />
        <Route path="/classes"         element={<RequireRole roles={ATS}><Classes /></RequireRole>} />
        <Route path="/class-subjects"  element={<RequireRole roles={ATS}><ClassSubjects /></RequireRole>} />
        <Route path="/enrollments"     element={<RequireRole roles={ATS}><Enrollments /></RequireRole>} />
        <Route path="/attendance"      element={<RequireRole roles={ATS}><Attendance /></RequireRole>} />
        <Route path="/grade-items"     element={<RequireRole roles={AT}><GradeItems /></RequireRole>} />
        <Route path="/student-grades"  element={<RequireRole roles={ATS}><StudentGrades /></RequireRole>} />
        <Route path="/cgpa"            element={<RequireRole roles={ATS}><CGPA /></RequireRole>} />
        <Route path="/academic-years"  element={<RequireRole roles={A}><AcademicYears /></RequireRole>} />
        <Route path="/users"           element={<RequireRole roles={A}><Users /></RequireRole>} />
        <Route path="/roles"           element={<RequireRole roles={A}><Roles /></RequireRole>} />
        <Route path="/reports" element={<RequireRole roles={ATS}><Reports /></RequireRole>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );

  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return <Layout><ProtectedRoute>{shell}</ProtectedRoute></Layout>;
}