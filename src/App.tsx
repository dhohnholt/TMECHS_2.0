import { AuthProvider } from './context/AuthContext'

import { SessionContextProvider } from '@supabase/auth-helpers-react'
import React, { useState, useEffect } from 'react'
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedLayout from './components/ProtectedLayout'

import HomePage from './pages/HomePage'
import UserGuide from './pages/UserGuide'
import UpdateRecord from './pages/UpdateRecord'
import ClassManager from './pages/ClassManager'
import DailyAttendance from './pages/DailyAttendance'
import Login from './pages/Login'
import Confirmemail from './pages/confirmemail'
import Pending from './pages/pending'
import TeacherAuth from './pages/TeacherAuth'
import Dashboard from './pages/Dashboard'
import ViolationEntry from './pages/ViolationEntry'
import DetentionAttendance from './pages/DetentionAttendance'
import StudentManagement from './pages/StudentManagement'
import DetentionManagement from './pages/DetentionManagement'
import Analytics from './pages/Analytics'
import MonitorSignup from './pages/MonitorSignup'
import UserProfile from './pages/UserProfile'
import TeacherApproval from './pages/TeacherApproval'
import PageTitles from './pages/PageTitles'
import ParentPortal from './pages/ParentPortal'
import ParentAccounts from './pages/ParentAccounts'
import Sandbox1 from './pages/Sandbox1'
import Sandbox2 from './pages/Sandbox2'
import TeacherReport from './pages/TeacherReport'
import MediaLibrary from './pages/MediaLibrary'
import ResetPassword from './pages/ResetPassword'
import StudentSchedule from './pages/StudentSchedule'
import StudentViolations from './pages/StudentViolations'
import SessionHandler from './components/SessionHandler'
import { supabase } from './lib/supabase'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

 
 
  const isPublicStudentPage = location.pathname === '/student-violations'

 


  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
      <div className="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-text)] transition-colors duration-300">
        <SessionHandler />
        <main className="mx-auto max-w-7xl flex-grow px-4 py-6">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<TeacherAuth />} />
            <Route path="/pending" element={<Pending />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/student-violations" element={<StudentViolations />} />
            <Route path="/parent-portal" element={<ParentPortal />} />

            {/* Protected Routes */}
            <Route element={<ProtectedLayout />}>
              <Route path="/homepage" element={<HomePage />} />
              <Route path="/user-guide" element={<UserGuide />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/class-manager" element={<ClassManager />} />
              <Route path="/confirmemail" element={<Confirmemail />} />
              <Route path="/violations" element={<ViolationEntry />} />
              <Route path="/attendance" element={<DetentionAttendance />} />
              <Route path="/daily-attendance" element={<DailyAttendance />} />
              <Route path="/students" element={<StudentManagement />} />
              <Route path="/detention" element={<DetentionManagement />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/monitor-signup" element={<MonitorSignup />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/teacher-approval" element={<TeacherApproval />} />
              <Route path="/page-titles" element={<PageTitles />} />
              <Route path="/parent-accounts" element={<ParentAccounts />} />
              <Route path="/sandbox2" element={<Sandbox2 />} />
              <Route path="/media-library" element={<MediaLibrary />} />
              <Route path="/update-record" element={<UpdateRecord />} />
              <Route path="/sandbox1" element={<Sandbox1 />} />
              <Route path="/teacher-report" element={<TeacherReport />} />
              <Route path="/student-schedule" element={<StudentSchedule />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {!isPublicStudentPage && <Footer />}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
            style: {
              background: '#f0f0f0', // tmechs-light
              color: '#014040', // tmechs-forest
              fontSize: '0.975rem',
              borderRadius: '0.5rem',
              padding: '12px 16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
            },
            icon: '🐴',
            success: {
              iconTheme: {
                primary: '#34d399',
                secondary: '#014040',
              },
            },
            error: {
              iconTheme: {
                primary: '#f87171',
                secondary: '#014040',
              },
            },
          }}
        />
      </div>
        </AuthProvider>
    </SessionContextProvider>
  )
}
