import { useBackendSync } from '@/hooks/useBackendSync';

export interface BackendSyncBridgeProps {
  enabled?: boolean;
  engineId?: number | null;
}

/**
 * Headless bridge component that mounts the periodic backend synchronization hook
 * without triggering top-level re-renders in visual dashboard components.
 */
export function BackendSyncBridge({ enabled, engineId }: BackendSyncBridgeProps) {
  useBackendSync({
    enabled: enabled ?? (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_BACKEND_SYNC !== 'false'),
    engineId,
  });

  return null;
}
