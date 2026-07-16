import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-darkBg text-white">
        <div className="relative h-20 w-20">
          <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-indigo opacity-75"></div>
          <div className="relative inline-flex rounded-full h-20 w-20 bg-accent-violet/30 border border-accent-indigo/50 justify-center items-center">
            <span className="text-xs font-semibold tracking-wider text-accent-blue animate-pulse">Loading</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
