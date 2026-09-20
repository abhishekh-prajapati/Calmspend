package com.pbp.personalfinance.detection;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Thread-safe SQLite database helper for the durable detection queue.
 * Operates with Write-Ahead Logging (WAL) enabled to support concurrent
 * reads and writes between background notification service and foreground UI.
 */
public class DetectionQueueDbHelper extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "pbp_detection_queue.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_NAME = "detection_queue";
    public static final String COL_ID = "id";
    public static final String COL_EVENT_ID = "event_id";
    public static final String COL_PACKAGE_NAME = "package_name";
    public static final String COL_TITLE = "title";
    public static final String COL_TEXT = "text";
    public static final String COL_SUB_TEXT = "sub_text";
    public static final String COL_POST_TIME = "post_time";
    public static final String COL_NOTIFICATION_KEY = "notification_key";
    public static final String COL_CREATED_AT = "created_at";
    public static final String COL_PROCESSED_AT = "processed_at";
    public static final String COL_EXPIRES_AT = "expires_at";

    private static DetectionQueueDbHelper instance;

    public static synchronized DetectionQueueDbHelper getInstance(Context context) {
        if (instance == null) {
            instance = new DetectionQueueDbHelper(context.getApplicationContext());
        }
        return instance;
    }

    private DetectionQueueDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onConfigure(SQLiteDatabase db) {
        super.onConfigure(db);
        db.enableWriteAheadLogging();
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        String createTableQuery = "CREATE TABLE IF NOT EXISTS " + TABLE_NAME + " ("
                + COL_ID + " TEXT PRIMARY KEY, "
                + COL_EVENT_ID + " TEXT UNIQUE NOT NULL, "
                + COL_PACKAGE_NAME + " TEXT NOT NULL, "
                + COL_TITLE + " TEXT, "
                + COL_TEXT + " TEXT, "
                + COL_SUB_TEXT + " TEXT, "
                + COL_POST_TIME + " INTEGER NOT NULL, "
                + COL_NOTIFICATION_KEY + " TEXT NOT NULL, "
                + COL_CREATED_AT + " TEXT NOT NULL, "
                + COL_PROCESSED_AT + " TEXT, "
                + COL_EXPIRES_AT + " TEXT NOT NULL"
                + ");";

        db.execSQL(createTableQuery);
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_detection_queue_event_id ON " + TABLE_NAME + "(" + COL_EVENT_ID + ");");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_detection_queue_processed ON " + TABLE_NAME + "(" + COL_PROCESSED_AT + ");");
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_detection_queue_expires ON " + TABLE_NAME + "(" + COL_EXPIRES_AT + ");");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Future database migration handling
    }

    public static class QueueItem {
        public String id;
        public String eventId;
        public String packageName;
        public String title;
        public String text;
        public String subText;
        public long postTime;
        public String notificationKey;
        public String createdAt;
        public String processedAt;
        public String expiresAt;
    }

    /**
     * Inserts an item into the detection queue with UNIQUE(event_id) enforcement.
     * Returns true if inserted, false if duplicate.
     */
    public synchronized boolean insertQueueItem(QueueItem item) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues values = new ContentValues();
        values.put(COL_ID, item.id);
        values.put(COL_EVENT_ID, item.eventId);
        values.put(COL_PACKAGE_NAME, item.packageName);
        values.put(COL_TITLE, item.title);
        values.put(COL_TEXT, item.text);
        values.put(COL_SUB_TEXT, item.subText);
        values.put(COL_POST_TIME, item.postTime);
        values.put(COL_NOTIFICATION_KEY, item.notificationKey);
        values.put(COL_CREATED_AT, item.createdAt);
        values.put(COL_PROCESSED_AT, item.processedAt);
        values.put(COL_EXPIRES_AT, item.expiresAt);

        long rowId = db.insertWithOnConflict(TABLE_NAME, null, values, SQLiteDatabase.CONFLICT_IGNORE);
        return rowId != -1;
    }

    /**
     * Retrieves all un-processed and un-expired pending queue items.
     */
    public synchronized List<QueueItem> getPendingItems(int limit) {
        List<QueueItem> items = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();

        String nowIso = getIsoTimestamp(System.currentTimeMillis());
        String query = "SELECT * FROM " + TABLE_NAME
                + " WHERE " + COL_PROCESSED_AT + " IS NULL AND " + COL_EXPIRES_AT + " > ?"
                + " ORDER BY " + COL_POST_TIME + " ASC LIMIT ?";

        try (Cursor cursor = db.rawQuery(query, new String[]{nowIso, String.valueOf(limit)})) {
            if (cursor.moveToFirst()) {
                do {
                    QueueItem item = new QueueItem();
                    item.id = cursor.getString(cursor.getColumnIndexOrThrow(COL_ID));
                    item.eventId = cursor.getString(cursor.getColumnIndexOrThrow(COL_EVENT_ID));
                    item.packageName = cursor.getString(cursor.getColumnIndexOrThrow(COL_PACKAGE_NAME));
                    item.title = cursor.getString(cursor.getColumnIndexOrThrow(COL_TITLE));
                    item.text = cursor.getString(cursor.getColumnIndexOrThrow(COL_TEXT));
                    item.subText = cursor.getString(cursor.getColumnIndexOrThrow(COL_SUB_TEXT));
                    item.postTime = cursor.getLong(cursor.getColumnIndexOrThrow(COL_POST_TIME));
                    item.notificationKey = cursor.getString(cursor.getColumnIndexOrThrow(COL_NOTIFICATION_KEY));
                    item.createdAt = cursor.getString(cursor.getColumnIndexOrThrow(COL_CREATED_AT));
                    item.processedAt = cursor.getString(cursor.getColumnIndexOrThrow(COL_PROCESSED_AT));
                    item.expiresAt = cursor.getString(cursor.getColumnIndexOrThrow(COL_EXPIRES_AT));
                    items.add(item);
                } while (cursor.moveToNext());
            }
        }

        return items;
    }

    /**
     * Marks queue items as processed or deletes them immediately for privacy.
     */
    public synchronized int markItemsProcessed(List<String> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        SQLiteDatabase db = getWritableDatabase();

        StringBuilder placeholders = new StringBuilder();
        for (int i = 0; i < ids.size(); i++) {
            placeholders.append(i == 0 ? "?" : ",?");
        }

        // Delete processed records to ensure sensitive raw notification text is not retained
        return db.delete(TABLE_NAME, COL_ID + " IN (" + placeholders.toString() + ")", ids.toArray(new String[0]));
    }

    /**
     * Purges expired queue items (older than expiresAt) to prevent raw data accumulation.
     */
    public synchronized int purgeExpiredItems() {
        SQLiteDatabase db = getWritableDatabase();
        String nowIso = getIsoTimestamp(System.currentTimeMillis());
        return db.delete(TABLE_NAME, COL_EXPIRES_AT + " <= ?", new String[]{nowIso});
    }

    public static String getIsoTimestamp(long millis) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date(millis));
    }
}
