package com.pbp.personalfinance.detection;

import android.app.Notification;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Native Android NotificationListenerService for Personal Budget Planner.
 * Captures notifications strictly from enabled payment applications,
 * sanitizes their text content, and writes to the durable encrypted queue.
 *
 * ZERO network communication. ZERO telemetry. ZERO full-text persistent logs.
 */
public class PBPNotificationListenerService extends NotificationListenerService {

    public static final String PREFS_NAME = "pbp_detection_prefs";
    public static final String PREF_DETECTION_ENABLED = "detection_enabled";
    public static final String PREF_PROVIDERS_PREFIX = "provider_enabled_";

    public static final String PKG_GPAY = "com.google.android.apps.nbu.paisa.user";
    public static final String PKG_PHONEPE = "com.phonepe.app";
    public static final String PKG_PAYTM = "net.one97.paytm";
    public static final String PKG_BHIM = "in.org.npci.upiapp";

    private static final Set<String> SUPPORTED_PACKAGES = new HashSet<>(Arrays.asList(
            PKG_GPAY,
            PKG_PHONEPE,
            PKG_PAYTM,
            PKG_BHIM
    ));

    private DetectionQueueDbHelper dbHelper;

    @Override
    public void onCreate() {
        super.onCreate();
        dbHelper = DetectionQueueDbHelper.getInstance(this);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) {
            return;
        }

        String packageName = sbn.getPackageName();
        if (packageName == null || !SUPPORTED_PACKAGES.contains(packageName)) {
            // Silently ignore non-whitelisted applications without logging
            return;
        }

        // Check user preferences
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        boolean isOverallEnabled = prefs.getBoolean(PREF_DETECTION_ENABLED, true);
        if (!isOverallEnabled) {
            return;
        }

        String providerKey = getProviderKey(packageName);
        if (providerKey != null) {
            boolean isProviderEnabled = prefs.getBoolean(PREF_PROVIDERS_PREFIX + providerKey, true);
            if (!isProviderEnabled) {
                return;
            }
        }

        Notification notification = sbn.getNotification();
        Bundle extras = notification.extras;
        if (extras == null) {
            return;
        }

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence subTextCs = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
        CharSequence bigTextCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);

        String title = titleCs != null ? titleCs.toString().trim() : "";
        String text = bigTextCs != null ? bigTextCs.toString().trim() : (textCs != null ? textCs.toString().trim() : "");
        String subText = subTextCs != null ? subTextCs.toString().trim() : "";

        // Discard empty notifications
        if (title.isEmpty() && text.isEmpty()) {
            return;
        }

        long postTime = sbn.getPostTime();
        String notificationKey = sbn.getKey() != null ? sbn.getKey() : String.valueOf(sbn.getId());

        // Generate deterministic event ID
        String cleanKey = notificationKey.replaceAll("[^a-zA-Z0-9_-]", "");
        String eventId = "evt_" + packageName + "_" + cleanKey + "_" + postTime;

        long now = System.currentTimeMillis();
        long expiresAtMillis = now + (72L * 60 * 60 * 1000); // 72-hour operational TTL

        DetectionQueueDbHelper.QueueItem item = new DetectionQueueDbHelper.QueueItem();
        item.id = "q_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        item.eventId = eventId;
        item.packageName = packageName;
        item.title = title;
        item.text = text;
        item.subText = subText;
        item.postTime = postTime;
        item.notificationKey = notificationKey;
        item.createdAt = DetectionQueueDbHelper.getIsoTimestamp(now);
        item.processedAt = null;
        item.expiresAt = DetectionQueueDbHelper.getIsoTimestamp(expiresAtMillis);

        // Durable insert into SQLite queue table
        boolean inserted = dbHelper.insertQueueItem(item);

        if (inserted) {
            // Optional: notify live Capacitor listener if application is foregrounded
            TransactionDetectorPlugin.notifyLiveNotificationReceived(item);

            // Periodic hygiene: purge expired entries older than 72 hours
            dbHelper.purgeExpiredItems();
        }
    }

    private String getProviderKey(String packageName) {
        switch (packageName) {
            case PKG_GPAY:
                return "gpay";
            case PKG_PHONEPE:
                return "phonepe";
            case PKG_PAYTM:
                return "paytm";
            case PKG_BHIM:
                return "bhim";
            default:
                return null;
        }
    }
}
