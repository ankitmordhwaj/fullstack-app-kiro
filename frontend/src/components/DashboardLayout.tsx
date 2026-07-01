import { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './DashboardLayout.module.css';

export type SidebarMode = 'full' | 'collapsed' | 'hidden';

/**
 * Custom hook that determines the sidebar display mode based on viewport width.
 * - 'full' for ≥1024px (shows icons + labels, 240px wide)
 * - 'collapsed' for 640–1023px (icons only, 64px wide)
 * - 'hidden' for <640px (sidebar hidden, hamburger toggle)
 *
 * Uses window.matchMedia listeners for efficient breakpoint detection.
 */
export function useSidebarMode(): SidebarMode {
  const getMode = useCallback((): SidebarMode => {
    if (globalThis.window === undefined) return 'full';
    if (globalThis.matchMedia('(min-width: 1024px)').matches) return 'full';
    if (globalThis.matchMedia('(min-width: 640px)').matches) return 'collapsed';
    return 'hidden';
  }, []);

  const [mode, setMode] = useState<SidebarMode>(getMode);

  useEffect(() => {
    const lgQuery = globalThis.matchMedia('(min-width: 1024px)');
    const smQuery = globalThis.matchMedia('(min-width: 640px)');

    const handleChange = (): void => {
      setMode(getMode());
    };

    lgQuery.addEventListener('change', handleChange);
    smQuery.addEventListener('change', handleChange);

    return () => {
      lgQuery.removeEventListener('change', handleChange);
      smQuery.removeEventListener('change', handleChange);
    };
  }, [getMode]);

  return mode;
}

function DashboardLayout() {
  const { token } = useAuth();
  const mode = useSidebarMode();
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Reset mobileOpen when mode transitions away from 'hidden'
  useEffect(() => {
    if (mode !== 'hidden') {
      setMobileOpen(false);
    }
  }, [mode]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const rightSideClasses = [
    styles.rightSide,
    mode === 'collapsed' ? styles.rightSideCollapsed : '',
    mode === 'hidden' ? styles.rightSideHidden : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.layout}>
      <Sidebar
        collapsed={mode === 'collapsed'}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className={rightSideClasses}>
        <TopBar
          showHamburger={mode === 'hidden'}
          onHamburgerClick={() => setMobileOpen((prev) => !prev)}
        />
        <div className={styles.contentWrapper}>
          <main className={styles.main}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
