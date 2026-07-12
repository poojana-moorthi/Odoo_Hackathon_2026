import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSkeleton from './LoadingSkeleton';

const ProtectedRoute = ({ children, allowedRoleIds = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="w-1/2 p-6">
          <LoadingSkeleton rows={4} className="h-6 mb-4" />
        </div>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Fleet Managers (role_id = 1) can access all protected routes bypass
  if (user.role_id === 1) {
    return children;
  }

  // Check if role is allowed
  if (allowedRoleIds.length > 0 && !allowedRoleIds.includes(user.role_id)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export default ProtectedRoute;
