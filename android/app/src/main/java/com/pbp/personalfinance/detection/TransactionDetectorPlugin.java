package com.pbp.personalfinance.detection;

import android.content.Intent;
import android.content.SharedPreferences;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "TransactionDetectorPlugin")
public class TransactionDetectorPlugin extends Plugin {

    private static TransactionDetectorPlugin activeInstance;

    @Override
    public void load() {
        super.load();
        activeInstance = this;
    }

    public static void notifyLiveNotificationReceived(DetectionQueueDbHelper.QueueItem item) {
        if (activeInstance != null && item != null) {
            JSObject jsItem = formatQueueItem(item);
            activeInstance.notifyListeners("onNotificationReceived", jsItem);
        }
    }

    @PluginMethod
    public void checkNotificationAccess(PluginCall call) {
        Set<String> packageNames = NotificationManagerCompat.getEnabledListenerPackages(getContext());
        boolean hasAccess = packageNames.contains(getContext().getPackageName());

        JSObject ret = new JSObject();
        ret.put("hasAccess", hasAccess);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestNotificationAccess(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);

        JSObject ret = new JSObject();
        ret.put("launched", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPendingQueueItems(PluginCall call) {
        DetectionQueueDbHelper dbHelper = DetectionQueueDbHelper.getInstance(getContext());
        List<DetectionQueueDbHelper.QueueItem> pending = dbHelper.getPendingItems(100);

        JSArray itemsArray = new JSArray();
        for (DetectionQueueDbHelper.QueueItem item : pending) {
            itemsArray.put(formatQueueItem(item));
        }

        JSObject ret = new JSObject();
        ret.put("candidates", itemsArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void markQueueItemsProcessed(PluginCall call) {
        JSArray idsArray = call.getArray("queueIds");
        if (idsArray == null || idsArray.length() == 0) {
            JSObject ret = new JSObject();
            ret.put("processedCount", 0);
            call.resolve(ret);
            return;
        }

        List<String> idList = new ArrayList<>();
        for (int i = 0; i < idsArray.length(); i++) {
            try {
                idList.add(idsArray.getString(i));
            } catch (Exception ignored) {}
        }

        DetectionQueueDbHelper dbHelper = DetectionQueueDbHelper.getInstance(getContext());
        int deleted = dbHelper.markItemsProcessed(idList);

        JSObject ret = new JSObject();
        ret.put("processedCount", deleted);
        call.resolve(ret);
    }

    @PluginMethod
    public void purgeExpiredQueueItems(PluginCall call) {
        DetectionQueueDbHelper dbHelper = DetectionQueueDbHelper.getInstance(getContext());
        int purged = dbHelper.purgeExpiredItems();

        JSObject ret = new JSObject();
        ret.put("purgedCount", purged);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateProviderSettings(PluginCall call) {
        Boolean isOverallEnabled = call.getBoolean("isEnabled");
        String providerId = call.getString("providerId");
        Boolean isProviderEnabled = call.getBoolean("isProviderEnabled");

        SharedPreferences prefs = getContext().getSharedPreferences(PBPNotificationListenerService.PREFS_NAME, getContext().MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        if (isOverallEnabled != null) {
            editor.putBoolean(PBPNotificationListenerService.PREF_DETECTION_ENABLED, isOverallEnabled);
        }
        if (providerId != null && isProviderEnabled != null) {
            editor.putBoolean(PBPNotificationListenerService.PREF_PROVIDERS_PREFIX + providerId, isProviderEnabled);
        }
        editor.apply();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    private static JSObject formatQueueItem(DetectionQueueDbHelper.QueueItem item) {
        JSObject obj = new JSObject();
        obj.put("id", item.id);
        obj.put("eventId", item.eventId);
        obj.put("packageName", item.packageName);
        obj.put("title", item.title);
        obj.put("text", item.text);
        obj.put("subText", item.subText);
        obj.put("postTime", item.postTime);
        obj.put("notificationKey", item.notificationKey);
        obj.put("createdAt", item.createdAt);
        obj.put("expiresAt", item.expiresAt);
        return obj;
    }
}
