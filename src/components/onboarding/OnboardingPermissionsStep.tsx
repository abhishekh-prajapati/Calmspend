import React, { useState, useEffect } from 'react';
import { osNotificationService } from '../../services/native/osNotificationService';
import { TransactionDetector } from '../../services/native/transactionDetectorPlugin';

interface OnboardingPermissionsStepProps {
  onBack: () => void;
  onFinish: () => void;
}

type PermissionStatus = 'pending' | 'granted' | 'skipped';

export const OnboardingPermissionsStep: React.FC<OnboardingPermissionsStepProps> = ({
  onBack,
  onFinish,
}) => {
  const [osNotificationStatus, setOsNotificationStatus] = useState<PermissionStatus>('pending');
  const [listenerStatus, setListenerStatus] = useState<PermissionStatus>('pending');
  const [isLoadingOs, setIsLoadingOs] = useState<boolean>(false);
  const [isLoadingListener, setIsLoadingListener] = useState<boolean>(false);

  useEffect(() => {
    // Check initial permission states if already granted
    void (async () => {
      try {
        const osState = await osNotificationService.checkPermission();
        if (osState === 'granted') {
          setOsNotificationStatus('granted');
        }
      } catch {
        // Fallback gracefully
      }

      try {
        const detectorState = await TransactionDetector.checkNotificationAccess();
        if (detectorState.hasAccess) {
          setListenerStatus('granted');
        }
      } catch {
        // Fallback gracefully
      }
    })();
  }, []);

  const handleRequestOsNotification = async () => {
    setIsLoadingOs(true);
    try {
      const granted = await osNotificationService.requestPermission();
      setOsNotificationStatus(granted ? 'granted' : 'skipped');
    } catch {
      setOsNotificationStatus('skipped');
    } finally {
      setIsLoadingOs(false);
    }
  };

  const handleSkipOsNotification = () => {
    setOsNotificationStatus('skipped');
  };

  const handleRequestTransactionDetector = async () => {
    setIsLoadingListener(true);
    try {
      const res = await TransactionDetector.requestNotificationAccess();
      if (res.launched) {
        // In native Android, settings intent opened. Re-check or mark granted
        const check = await TransactionDetector.checkNotificationAccess();
        setListenerStatus(check.hasAccess ? 'granted' : 'granted');
      } else {
        setListenerStatus('skipped');
      }
    } catch {
      setListenerStatus('skipped');
    } finally {
      setIsLoadingListener(false);
    }
  };

  const handleSkipTransactionDetector = () => {
    setListenerStatus('skipped');
  };

  return (
    <div className="calm-onboarding-step">
      <div className="calm-onboarding-step__header">
        <div className="calm-onboarding-icon-pill">
          <span className="material-symbols-outlined text-primary">security</span>
        </div>
        <h2 className="calm-onboarding-title">App Permissions</h2>
        <p className="calm-onboarding-desc">
          CalmSpend works best with these optional permissions. You can grant access now or skip each individually.
        </p>
      </div>

      <div className="calm-permissions-stack">
        {/* Permission 1: System Notifications */}
        <div className="calm-permission-card">
          <div className="calm-permission-card__header">
            <div className="calm-permission-card__icon">
              <span className="material-symbols-outlined">notifications_active</span>
            </div>
            <div className="calm-permission-card__content">
              <div className="calm-permission-card__title-row">
                <span className="calm-permission-card__title">Pacing &amp; System Alerts</span>
                {osNotificationStatus === 'granted' && (
                  <span className="calm-permission-badge calm-permission-badge--granted">Granted</span>
                )}
                {osNotificationStatus === 'skipped' && (
                  <span className="calm-permission-badge calm-permission-badge--skipped">Skipped</span>
                )}
              </div>
              <p className="calm-permission-card__desc">
                Receive proactive daily budget sweep alerts, spending pace warnings, and milestone celebrations.
              </p>
            </div>
          </div>

          <div className="calm-permission-card__actions">
            {osNotificationStatus === 'pending' ? (
              <>
                <button
                  type="button"
                  className="calm-perm-btn calm-perm-btn--skip"
                  onClick={handleSkipOsNotification}
                  disabled={isLoadingOs}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="calm-perm-btn calm-perm-btn--allow"
                  onClick={handleRequestOsNotification}
                  disabled={isLoadingOs}
                >
                  {isLoadingOs ? 'Allowing...' : 'Allow Alerts'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="calm-perm-btn calm-perm-btn--change"
                onClick={handleRequestOsNotification}
              >
                Change Permission
              </button>
            )}
          </div>
        </div>

        {/* Permission 2: Transaction Notification Reading */}
        <div className="calm-permission-card">
          <div className="calm-permission-card__header">
            <div className="calm-permission-card__icon">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div className="calm-permission-card__content">
              <div className="calm-permission-card__title-row">
                <span className="calm-permission-card__title">Auto-Detect UPI &amp; Bank SMS</span>
                {listenerStatus === 'granted' && (
                  <span className="calm-permission-badge calm-permission-badge--granted">Granted</span>
                )}
                {listenerStatus === 'skipped' && (
                  <span className="calm-permission-badge calm-permission-badge--skipped">Skipped</span>
                )}
              </div>
              <p className="calm-permission-card__desc">
                Automatically read incoming payment notifications on Android to create expense drafts with 0 cloud sync.
              </p>
            </div>
          </div>

          <div className="calm-permission-card__actions">
            {listenerStatus === 'pending' ? (
              <>
                <button
                  type="button"
                  className="calm-perm-btn calm-perm-btn--skip"
                  onClick={handleSkipTransactionDetector}
                  disabled={isLoadingListener}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="calm-perm-btn calm-perm-btn--allow"
                  onClick={handleRequestTransactionDetector}
                  disabled={isLoadingListener}
                >
                  {isLoadingListener ? 'Allowing...' : 'Allow Reader'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="calm-perm-btn calm-perm-btn--change"
                onClick={handleRequestTransactionDetector}
              >
                Change Permission
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="calm-onboarding-actions calm-onboarding-actions--split">
        <button
          type="button"
          className="calm-onboarding-btn calm-onboarding-btn--ghost"
          onClick={onBack}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back</span>
        </button>
        <button
          type="button"
          className="calm-onboarding-btn calm-onboarding-btn--primary"
          onClick={onFinish}
        >
          <span>Get Started</span>
          <span className="material-symbols-outlined text-[18px]">check</span>
        </button>
      </div>
    </div>
  );
};
