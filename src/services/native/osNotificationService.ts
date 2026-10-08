import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import type { NativeNotificationPermissionState } from '../../types/notification';

/**
 * Service to dispatch notifications to the device OS / System Control Center
 * Supports native Android/iOS (via Capacitor) and Web/Desktop (via Web Notifications API)
 */
export const osNotificationService = {
  /**
   * Check current OS notification permission
   */
  async checkPermission(): Promise<NativeNotificationPermissionState> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.checkPermissions();
        if (res.display === 'granted') return 'granted';
        if (res.display === 'denied') return 'denied';
        return 'default';
      } catch {
        return 'default';
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission as NativeNotificationPermissionState;
    }

    return 'denied';
  },

  /**
   * Check if OS notification API is available in current environment
   */
  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  },

  /**
   * Request OS notification permission from the user
   */
  async requestPermission(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.requestPermissions();
        return res.display === 'granted';
      } catch {
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return res === 'granted';
      } catch {
        return false;
      }
    }

    return false;
  },

  /**
   * Send notification to the device OS / System Control Center
   */
  async sendSystemNotification(title: string, body: string, id?: number): Promise<boolean> {
    const perm = await this.checkPermission();
    if (perm !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: id || Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              actionTypeId: '',
              extra: null,
            },
          ],
        });
        return true;
      } catch {
        return false;
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
        return true;
      } catch {
        return false;
      }
    }

    return false;
  },
};
