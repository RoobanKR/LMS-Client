'use client';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { flatNav, NAV_SUBTITLES } from './nav';
import { SidebarNavContent } from './SuperAdminSidebar';

/**
 * Chrome for the floating workspace panel — the pieces the retired topbar
 * used to own. The console has no bell (Notifications is a sidebar route), so
 * the panel corner hosts only the mobile nav trigger.
 */

/** Mobile nav trigger — a compact top bar at the top of the panel (below lg
    the rail is hidden); opens the same Sheet drawer the old topbar rendered.
    In flow rather than floating, so it never sits over a page's header
    actions. */
export function SuperAdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Close the drawer whenever the route changes (e.g. a menu action that
  // navigates without going through a nav link).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-[#EAECF0] px-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="sa-transition flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-white"
          style={{ background: 'linear-gradient(145deg,#FB8C3C,#F97316)' }}
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="min-w-0 truncate text-[13.5px] font-bold tracking-[-0.01em] text-[#111827]">Super Admin</span>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64 max-w-[calc(100vw-3rem)] p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-full flex-col bg-sidebar">
            <SidebarNavContent onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Page title inside the panel — replaces the old topbar's "Console › page"
    trail, which most pages relied on as their only visible title. */
export function SuperAdminPageHeading() {
  const pathname = usePathname();
  const current = flatNav.find((n) => pathname === n.href || pathname?.startsWith(n.href + '/'));
  if (!current) return null;
  const subtitle = NAV_SUBTITLES[current.href];
  return (
    // Sized like the L&D console's page headers (17px/700 title, 13px sub).
    <div className="mb-5">
      <h1 className="text-[17px] font-bold tracking-[-0.02em] text-[#111827]">{current.label}</h1>
      {subtitle && <p className="mt-1 text-[13px] text-[#374151]">{subtitle}</p>}
    </div>
  );
}
