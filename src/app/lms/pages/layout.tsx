"use client";

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import DashboardLayout from '../component/layout';
import ClientWorkspaceSkeleton from '@/features/businessmanagement/ClientWorkspaceSkeleton';
import BusinessWorkspaceChrome, { isBusinessWorkspaceRoute } from '@/features/businessmanagement/BusinessWorkspaceChrome';
import { isLdApprovalsRoute, isLdBusinessRoute, isLdCourseRoute, isLdNotificationsRoute, isPersistentDashboardRoute, isTrainerCourseRoute, usesLdShellRole, usesPersistentDashboardRole, usesTrainerShellRole } from '@/lib/dashboardRoutes';
import { StaffLayout } from '../component/stafflayout/staff-layout';
import { SESSION_KEYS } from '@/lib/session';
import { useNavigationLoader } from '@/components/navigation-loader/NavigationLoaderProvider';
import LDLayout from '../component/ldshell/LDLayout';
import { SidebarContext } from '../component/dashboard-context';

// "A shell is already rendered" — makes nested DashboardLayout wrappers
// content-only inside the L&D rail / trainer StaffLayout. Module-level so the
// value is stable.
const LD_HOSTED_SIDEBAR = { isCollapsed: false, setIsCollapsed: () => {}, hasSidebar: true };

export default function LmsPagesLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);
  const { setContentOnly } = useNavigationLoader();

  useEffect(() => {
    const readRole = () => {
      try {
        const roleValue = localStorage.getItem(SESSION_KEYS.roleValue);
        if (roleValue) { setRole(roleValue); return; }
        const user = JSON.parse(localStorage.getItem(SESSION_KEYS.userData) || 'null');
        const storedRole = user?.role;
        setRole((typeof storedRole === 'string' ? storedRole : storedRole?.roleValue || storedRole?.originalRole) ||
          localStorage.getItem(SESSION_KEYS.originalRole) || '');
      } catch { setRole(''); }
    };
    const onStorage = (event: StorageEvent) => {
      if (!event.key || [SESSION_KEYS.userData, SESSION_KEYS.roleValue, SESSION_KEYS.originalRole].some(key => key === event.key)) readRole();
    };
    readRole();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persistent = role !== null && usesPersistentDashboardRole(role) && isPersistentDashboardRoute(pathname);
  useEffect(() => {
    setContentOnly(persistent);
    return () => setContentOnly(false);
  }, [persistent, setContentOnly]);

  // Business Management's three routes (Client Management / Service Mapping /
  // Reports) share one tab strip. It is mounted HERE rather than by each page
  // so switching tabs is a plain content swap — the strip itself never
  // unmounts, so it cannot blink, re-animate its active underline, or be
  // replaced by a route-level skeleton.
  const workspace = isBusinessWorkspaceRoute(pathname);

  if (role === null && isPersistentDashboardRoute(pathname)) return <ClientWorkspaceSkeleton showTabs={false} />;

  // L&D Head / Subhead reach Business Management from their own rail — keep
  // that rail (LDLayout) instead of switching to the admin sidebar. The
  // SidebarContext marks the shell as present, so pages that still wrap
  // themselves in DashboardLayout (the client drill-down) render content-only
  // rather than nesting a second sidebar.
  if (role !== null && usesLdShellRole(role) && isLdBusinessRoute(pathname)) {
    const content = (
      <Suspense fallback={<ClientWorkspaceSkeleton showTabs={false} />}>
        {children}
      </Suspense>
    );
    return (
      <LDLayout active="business">
        <SidebarContext.Provider value={LD_HOSTED_SIDEBAR}>
          {workspace ? <BusinessWorkspaceChrome showAllTabs>{content}</BusinessWorkspaceChrome> : content}
        </SidebarContext.Provider>
      </LDLayout>
    );
  }
  // Same for Approvals: the L&D rail's "Approvals" item opens this shared
  // page, so keep the L&D rail (Approvals lit) rather than the admin sidebar.
  // …and Course Management (list + its per-course admin screens).
  const ldHosted = role !== null && usesLdShellRole(role)
    ? (isLdApprovalsRoute(pathname) ? 'approvals'
      : isLdCourseRoute(pathname) ? 'course-mgmt'
      : isLdNotificationsRoute(pathname) ? 'notifications'
      : null)
    : null;
  if (ldHosted) {
    return (
      <LDLayout active={ldHosted}>
        <SidebarContext.Provider value={LD_HOSTED_SIDEBAR}>
          <Suspense fallback={<ClientWorkspaceSkeleton showTabs={false} />}>
            {children}
          </Suspense>
        </SidebarContext.Provider>
      </LDLayout>
    );
  }
  // Trainers reach the same Course Management screens from their own rail —
  // keep the staff sidebar (StaffLayout) rather than the admin one. The pages
  // fetch with scope=enrolled for this role, so only the clients of the
  // trainer's enrolled courses are listed.
  if (role !== null && usesTrainerShellRole(role) && isTrainerCourseRoute(pathname)) {
    return (
      <StaffLayout noBuiltInPadding>
        <SidebarContext.Provider value={LD_HOSTED_SIDEBAR}>
          <Suspense fallback={<ClientWorkspaceSkeleton showTabs={false} />}>
            {children}
          </Suspense>
        </SidebarContext.Provider>
      </StaffLayout>
    );
  }
  // Roles outside the persistent shell still need the workspace chrome, since
  // the pages no longer carry it themselves.
  if (!persistent && !workspace) return <>{children}</>;

  // Route-level `loading.tsx` renders inside this boundary, which sits BELOW
  // the tab strip — a slow page skeletons its own content area only.
  const content = (
    <Suspense fallback={<ClientWorkspaceSkeleton showTabs={false} />}>
      {children}
    </Suspense>
  );

  return (
    <DashboardLayout>
      {workspace ? <BusinessWorkspaceChrome>{content}</BusinessWorkspaceChrome> : content}
    </DashboardLayout>
  );
}
