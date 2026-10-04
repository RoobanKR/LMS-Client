"use client";

import { useEffect, useState } from 'react';
import { SESSION_KEYS } from '@/lib/session';
import { usesTrainerShellRole } from '@/lib/dashboardRoutes';

/**
 * Whether the signed-in user is a trainer, whose Course Management lists only
 * the clients of the courses it is enrolled in (`scope=enrolled`).
 * `null` until the role has been read — callers hold their query until then,
 * so the unscoped list never flashes for a trainer.
 */
export function useTrainerEnrolledScope(): boolean | null {
  const [trainer, setTrainer] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      setTrainer(usesTrainerShellRole(
        localStorage.getItem(SESSION_KEYS.roleValue) || localStorage.getItem(SESSION_KEYS.originalRole) || '',
      ));
    } catch { setTrainer(false); }
  }, []);
  return trainer;
}
