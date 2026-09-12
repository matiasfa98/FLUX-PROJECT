// src/components/layout/AppShell.jsx
import React, { Suspense, lazy, useRef, useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { NavigationRail } from './NavigationRail';
import { TopNavbar } from './TopNavbar';
import { BotDrawer } from '../../features/bot/components/BotDrawer';
import { NotificationToaster } from '../feedback/NotificationToaster';
import { WorkspaceErrorBoundary } from '../../app/WorkspaceErrorBoundary';
import { LoadingScreen } from '../feedback/LoadingScreen';

const WorkspacePage = lazy(() =>
  import('../../features/workspace/pages/WorkspacePage')
);

/*
|--------------------------------------------------------------------------
| WORKSPACE HOST
|--------------------------------------------------------------------------
| Keeps the last /workspace/:roomId mounted even after navigating away.
| When you return to the same room, it stays mounted (no remount, no
| socket reconnect, no state loss).
|
| When you enter a DIFFERENT room, it unmounts and remounts for the
| new roomId. That's correct.
|--------------------------------------------------------------------------
*/
const WorkspaceHost = ({ active, roomId }) => {
  // Remember the last non-null roomId so we can keep rendering the
  // workspace even after the URL changes away from /workspace/*.
  const [heldRoomId, setHeldRoomId] = useState(roomId);

  useEffect(() => {
    if (roomId && roomId !== heldRoomId) {
      setHeldRoomId(roomId);
    }
  }, [roomId, heldRoomId]);

  if (!heldRoomId) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // Hide visually when not on the workspace route, but keep mounted.
        visibility: active ? 'visible' : 'hidden',
        pointerEvents: active ? 'auto' : 'none',
        zIndex: active ? 1 : 0,
      }}
      aria-hidden={!active}
    >
      <WorkspaceErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <WorkspacePage key={heldRoomId} />
        </Suspense>
      </WorkspaceErrorBoundary>
    </div>
  );
};

export const AppShell = () => {
  const location = useLocation();

  // Extract roomId from the URL when on /workspace/:roomId
  const roomMatch = location.pathname.match(/^\/workspace\/([^/]+)/);
  const routeRoomId = roomMatch ? roomMatch[1] : null;
  const isWorkspaceRoute = Boolean(routeRoomId);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-main)',
      }}
    >
      <NavigationRail />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TopNavbar />

        <main
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-main)',
          }}
        >
          {/* Non-workspace routes */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              visibility: isWorkspaceRoute ? 'hidden' : 'visible',
              pointerEvents: isWorkspaceRoute ? 'none' : 'auto',
            }}
          >
            <Outlet />
          </div>

          {/* Workspace: always rendered once a room has been opened */}
          <WorkspaceHost active={isWorkspaceRoute} roomId={routeRoomId} />
        </main>
      </div>

      <BotDrawer />
      <NotificationToaster />
    </div>
  );
};

export default AppShell;