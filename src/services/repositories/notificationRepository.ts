import type { AppNotification } from '../../types/notification';

const NOTIFICATIONS_STORAGE_KEY = 'pbp_notifications_v1';

export class NotificationRepository {
  private memoryCache: AppNotification[] | null = null;

  private load(): AppNotification[] {
    if (this.memoryCache !== null) {
      return this.memoryCache;
    }

    if (typeof localStorage === 'undefined') {
      this.memoryCache = [];
      return this.memoryCache;
    }

    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) {
        this.memoryCache = [];
        return this.memoryCache;
      }
      this.memoryCache = JSON.parse(raw) as AppNotification[];
      return this.memoryCache;
    } catch {
      this.memoryCache = [];
      return this.memoryCache;
    }
  }

  private save(items: AppNotification[]): void {
    this.memoryCache = items;
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Handle storage quota
      }
    }
  }

  getAll(): AppNotification[] {
    return [...this.load()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getActive(): AppNotification[] {
    return this.getAll().filter((n) => !n.isDismissed);
  }

  getUnreadCount(): number {
    return this.getAll().filter((n) => !n.isRead && !n.isDismissed).length;
  }

  add(data: Omit<AppNotification, 'id' | 'createdAt' | 'updatedAt' | 'isRead' | 'isDismissed' | 'actionTaken'>): AppNotification {
    const list = this.load();
    const nowIso = new Date().toISOString();
    const item: AppNotification = {
      ...data,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      isRead: false,
      isDismissed: false,
      actionTaken: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    list.unshift(item);
    // Keep max 50 recent notifications
    this.save(list.slice(0, 50));
    return item;
  }

  markAsRead(id: string): boolean {
    const list = this.load();
    const item = list.find((n) => n.id === id);
    if (!item) return false;
    item.isRead = true;
    item.updatedAt = new Date().toISOString();
    this.save(list);
    return true;
  }

  markAllAsRead(): void {
    const list = this.load();
    const now = new Date().toISOString();
    list.forEach((n) => {
      n.isRead = true;
      n.updatedAt = now;
    });
    this.save(list);
  }

  markActionTaken(id: string): boolean {
    const list = this.load();
    const item = list.find((n) => n.id === id);
    if (!item) return false;
    item.actionTaken = true;
    item.isRead = true;
    item.updatedAt = new Date().toISOString();
    this.save(list);
    return true;
  }

  dismiss(id: string): boolean {
    const list = this.load();
    const item = list.find((n) => n.id === id);
    if (!item) return false;
    item.isDismissed = true;
    item.updatedAt = new Date().toISOString();
    this.save(list);
    return true;
  }

  clearAll(): void {
    this.save([]);
  }
}

export const notificationRepository = new NotificationRepository();
