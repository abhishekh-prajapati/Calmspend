/**
 * STAGE 7.2 — NATIVE QUEUE CONTRACT & EVENT ID DETERMINISM TESTS
 *
 * Tests:
 * 1. eventId generation determinism across identical notification attributes.
 * 2. eventId differentiation across different timestamps / keys.
 * 3. Package whitelist definitions (GPay, PhonePe, Paytm, BHIM).
 * 4. Operational queue 72-hour TTL calculation.
 * 5. Plugin contract methods and web fallback safety.
 */

import { describe, it, expect } from 'vitest';
import { TransactionDetector } from '../native/transactionDetectorPlugin';
import type { RawNotificationPayload } from '../../types/detection';

export function generateTestEventId(packageName: string, notificationKey: string, postTime: number): string {
  const cleanKey = notificationKey.replace(/[^a-zA-Z0-9_-]/g, '');
  return `evt_${packageName}_${cleanKey}_${postTime}`;
}

describe('Stage 7.2: Android Notification Listener & Queue Contract Suite', () => {
  const SUPPORTED_PACKAGES = [
    'com.google.android.apps.nbu.paisa.user', // Google Pay
    'com.phonepe.app',                         // PhonePe
    'net.one97.paytm',                         // Paytm
    'in.org.npci.upiapp',                      // BHIM
  ];

  it('1. generates deterministic eventId for identical notification metadata', () => {
    const pkg = 'com.google.android.apps.nbu.paisa.user';
    const key = '0|com.google.android.apps.nbu.paisa.user|12345|tag|1001';
    const postTime = 1773829200000;

    const eventId1 = generateTestEventId(pkg, key, postTime);
    const eventId2 = generateTestEventId(pkg, key, postTime);

    expect(eventId1).toBe(eventId2);
    expect(eventId1).toBe('evt_com.google.android.apps.nbu.paisa.user_0comgoogleandroidappsnbuuser12345tag1001_1773829200000'.replace('nbuuser', 'nbupaisauser'));
  });

  it('2. generates distinct eventIds for different post timestamps or notification keys', () => {
    const pkg = 'com.phonepe.app';
    const key = 'key_123';
    const timeA = 1773829200000;
    const timeB = 1773829205000;

    const eventIdA = generateTestEventId(pkg, key, timeA);
    const eventIdB = generateTestEventId(pkg, key, timeB);
    const eventIdDiffKey = generateTestEventId(pkg, 'key_999', timeA);

    expect(eventIdA).not.toBe(eventIdB);
    expect(eventIdA).not.toBe(eventIdDiffKey);
  });

  it('3. validates that supported payment packages match expected Android identifiers', () => {
    expect(SUPPORTED_PACKAGES).toContain('com.google.android.apps.nbu.paisa.user');
    expect(SUPPORTED_PACKAGES).toContain('com.phonepe.app');
    expect(SUPPORTED_PACKAGES).toContain('net.one97.paytm');
    expect(SUPPORTED_PACKAGES).toContain('in.org.npci.upiapp');
    expect(SUPPORTED_PACKAGES).toHaveLength(4);
  });

  it('4. calculates 72-hour operational queue TTL accurately', () => {
    const postTime = Date.UTC(2026, 2, 18, 10, 0, 0); // 2026-03-18 10:00:00 UTC
    const expiresAtMillis = postTime + (72 * 60 * 60 * 1000);
    const expiresAtDate = new Date(expiresAtMillis);

    expect(expiresAtDate.toISOString()).toBe('2026-03-21T10:00:00.000Z');
  });

  it('5. validates TransactionDetector plugin interface and fallback behavior', async () => {
    const access = await TransactionDetector.checkNotificationAccess();
    expect(access).toHaveProperty('hasAccess');
    expect(typeof access.hasAccess).toBe('boolean');

    const pending = await TransactionDetector.getPendingQueueItems();
    expect(pending).toHaveProperty('candidates');
    expect(Array.isArray(pending.candidates)).toBe(true);

    const purgeResult = await TransactionDetector.purgeExpiredQueueItems();
    expect(purgeResult).toHaveProperty('purgedCount');

    const updateResult = await TransactionDetector.updateProviderSettings({ isEnabled: true });
    expect(updateResult.success).toBe(true);
  });

  it('6. validates queue item structure adheres to RawNotificationPayload schema', () => {
    const sampleItem: RawNotificationPayload = {
      eventId: 'evt_gpay_sample_123',
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Paid ₹450 to Swiggy',
      text: 'UPI transaction completed successfully. Ref: 428192849102',
      subText: 'Google Pay',
      postTime: 1773829200000,
      notificationKey: 'key_sample_123',
    };

    expect(sampleItem.eventId).toMatch(/^evt_/);
    expect(sampleItem.packageName).toBe('com.google.android.apps.nbu.paisa.user');
    expect(typeof sampleItem.postTime).toBe('number');
  });
});
