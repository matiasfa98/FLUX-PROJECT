// src/app/routes.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { WorkspaceErrorBoundary } from './WorkspaceErrorBoundary';
import { AppShell } from '../components/layout/AppShell';
import { LoadingScreen } from '../components/feedback/LoadingScreen';

const LandingPage = lazy(() => import('../features/landing/pages/LandingPage'));
const GuidelinesPage = lazy(() => import('../features/guidelines/pages/GuidelinesPage'));
const SignInPage = lazy(() => import('../features/auth/pages/SignInPage'));
const SignUpPage = lazy(() => import('../features/auth/pages/SignUpPage'));
const PlaygroundPage = lazy(() => import('../features/playground/pages/PlaygroundPage'));
const RoomLobbyPage = lazy(() => import('../features/workspace/pages/RoomLobbyPage'));
const ChatHubPage = lazy(() => import('../features/chat/pages/ChatHubPage'));
const PricingPage = lazy(() => import('../features/billing/pages/PricingPage'));
const SettingsPage = lazy(() => import('../features/user-profile/pages/SettingsPage'));
const JoinRoomPage = lazy(() => import('../features/workspace/pages/JoinRoomPage'));

export const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Public Standalone Marketing Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/guidelines" element={<GuidelinesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />

      {/* Cockpit Shell */}
      <Route element={<AppShell />}>
        <Route path="/playground" element={<PlaygroundPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/rooms" element={<RoomLobbyPage />} />
          <Route path="/rooms/join/:roomId" element={<JoinRoomPage />} />

          {/* Workspace is now handled by PersistentWorkspace in AppShell. */}
          <Route
            path="/workspace/:roomId"
            element={<div style={{ height: '100%' }} />}
          />

          <Route path="/chat" element={<ChatHubPage />} />
          <Route path="/chat/:threadId" element={<ChatHubPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Suspense>
);