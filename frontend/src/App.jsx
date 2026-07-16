import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CourseDetails from './pages/CourseDetails';
import MyCourses from './pages/MyCourses';
import CreateCourse from './pages/CreateCourse';
import EditCourse from './pages/EditCourse';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex flex-col min-h-screen bg-darkBg text-slate-100 selection:bg-accent-violet/30 selection:text-white">
          <Navbar />
          
          <main className="flex-1">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/courses/:id" element={<CourseDetails />} />

              {/* Authenticated Student/User Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Mentor Guarded Routes */}
              <Route
                path="/mentor/courses"
                element={
                  <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                    <MyCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/create"
                element={
                  <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                    <CreateCourse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses/edit/:id"
                element={
                  <ProtectedRoute allowedRoles={['mentor', 'admin']}>
                    <EditCourse />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500 bg-slate-950/20">
            &copy; {new Date().getFullYear()} Innovature E-Learning. All rights reserved.
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
