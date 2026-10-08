export type AppNotificationType =
  | 'daily_sweep'
  | 'goal_milestone'
  | 'goal_monthly_reminder'
  | 'daily_pacing'
  | 'system';

export interface AppNotificationMetadata {
  dateKey?: string; // YYYY-MM-DD
  surplusMinor?: number; // Minor units unspent
  goalId?: string;
  goalName?: string;
  milestonePercent?: number;
  targetAmountMinor?: number;
  monthlyTargetMinor?: number;
}

export interface AppNotification {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  isRead: boolean;
  isDismissed: boolean;
  actionTaken: boolean;
  metadata?: AppNotificationMetadata;
  createdAt: string;
  updatedAt: string;
}

export type NativeNotificationPermissionState = 'default' | 'granted' | 'denied';
