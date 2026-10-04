"use client";

import { createContext, useContext, type ReactNode } from 'react';

interface Ctx {
  isNavigating: boolean;
  start: (pathname?: string) => void;
  stop: () => void;
  setContentOnly: (enabled: boolean) => void;
}

// Loading belongs to each route or content panel. Keep the navigation API
// compatible with existing callers without covering their skeletons.
const navigationState: Ctx = {
  isNavigating: false,
  start: () => {},
  stop: () => {},
  setContentOnly: () => {},
};
const NavigationLoaderContext = createContext<Ctx>(navigationState);

export function NavigationLoaderProvider({ children }: { children: ReactNode }) {
  return (
    <NavigationLoaderContext.Provider value={navigationState}>
      {children}
    </NavigationLoaderContext.Provider>
  );
}

export function useNavigationLoader(): Ctx {
  return useContext(NavigationLoaderContext);
}
