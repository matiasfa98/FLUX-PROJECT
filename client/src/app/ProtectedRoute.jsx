// src/app/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/feedback/LoadingScreen';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Authenticating credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};