import { useBackendSync } from '@/hooks/useBackendSync';
import { useBackendWebSocket } from '@/hooks/useBackendWebSocket';

export interface BackendSyncBridgeProps {
  enabled?: boolean;
  engineId?: number | null;
}

/**
 * Headless bridge component that mounts the periodic backend synchronization hook
 * and authoritative FastAPI WebSocket streaming client without triggering top-level re-renders.
 */
export function BackendSyncBridge({ enabled, engineId }: BackendSyncBridgeProps) {
  const isEnabled = enabled ?? (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ENABLE_BACKEND_SYNC !== 'false');

  useBackendWebSocket(isEnabled);
  useBackendSync({
    enabled: isEnabled,
    engineId,
  });

  return null;
}
