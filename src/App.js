import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import StudentApp from './StudentApp';
import CoordinatorApp from './CoordinatorApp';
import FacultyApp from './FacultyApp';
import { Spinner } from './ui';

function AppInner() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>;
  if (!user) return <LoginPage />;
  if (user.role === 'student')     return <StudentApp />;
  if (user.role === 'coordinator') return <CoordinatorApp />;
  if (user.role === 'faculty')     return <FacultyApp />;
  return <div>Unknown role</div>;
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
