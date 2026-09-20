/**
 * STAGE 7.2 — TRANSACTION DETECTOR CAPACITOR PLUGIN BRIDGE
 *
 * Bridge interface connecting TypeScript layer to native Android
 * TransactionDetectorPlugin and SQLite detection queue.
 */

import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import type { RawNotificationPayload } from '../../types/detection';

export interface CheckAccessResult {
  hasAccess: boolean;
}

export interface RequestAccessResult {
  launched: boolean;
}

export interface GetPendingItemsResult {
  candidates: RawNotificationPayload[];
}

export interface ProcessItemsResult {
  processedCount: number;
}

export interface PurgeExpiredResult {
  purgedCount: number;
}

export interface UpdateProviderSettingsOptions {
  isEnabled?: boolean;
  providerId?: string;
  isProviderEnabled?: boolean;
}

export interface TransactionDetectorPlugin {
  checkNotificationAccess(): Promise<CheckAccessResult>;
  requestNotificationAccess(): Promise<RequestAccessResult>;
  getPendingQueueItems(): Promise<GetPendingItemsResult>;
  markQueueItemsProcessed(options: { queueIds: string[] }): Promise<ProcessItemsResult>;
  purgeExpiredQueueItems(): Promise<PurgeExpiredResult>;
  updateProviderSettings(options: UpdateProviderSettingsOptions): Promise<{ success: boolean }>;
  addListener(
    eventName: 'onNotificationReceived',
    listenerFunc: (notification: RawNotificationPayload) => void,
  ): Promise<PluginListenerHandle>;
}

// In-memory mock queue for non-Android / Web preview environments
const webMockQueue: RawNotificationPayload[] = [];

export function pushToWebMockQueue(item: RawNotificationPayload): void {
  webMockQueue.push(item);
}

export function clearWebMockQueue(): void {
  webMockQueue.length = 0;
}

export const TransactionDetector = registerPlugin<TransactionDetectorPlugin>('TransactionDetectorPlugin', {
  web: {
    checkNotificationAccess: async () => ({ hasAccess: false }),
    requestNotificationAccess: async () => ({ launched: false }),
    getPendingQueueItems: async () => ({ candidates: [...webMockQueue] }),
    markQueueItemsProcessed: async ({ queueIds }: { queueIds: string[] }) => {
      const initialCount = webMockQueue.length;
      const idsSet = new Set(queueIds);
      const remaining = webMockQueue.filter((item) => !idsSet.has(item.eventId));
      webMockQueue.length = 0;
      webMockQueue.push(...remaining);
      return { processedCount: initialCount - remaining.length };
    },
    purgeExpiredQueueItems: async () => ({ purgedCount: 0 }),
    updateProviderSettings: async () => ({ success: true }),
    addListener: async () => ({
      remove: async () => {},
    }),
  },
});
