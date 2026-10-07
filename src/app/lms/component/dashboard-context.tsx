"use client";

import { createContext, useContext } from "react";

export const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  hasSidebar: boolean;
  /** Below lg the rail is an off-canvas drawer; these drive it. Optional so
      hosted shells (L&D rail, trainer StaffLayout) can omit them. */
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}>({ isCollapsed: true, setIsCollapsed: () => {}, hasSidebar: false });

export const useSidebar = () => useContext(SidebarContext);
