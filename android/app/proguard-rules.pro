# Google Play Protect and ProGuard Optimization Rules

# 1. Keep Capacitor Native Plugin Interfaces & Bridges
-keep public class * extends com.getcapacitor.Plugin {
    public *;
}
-keep public class com.getcapacitor.** { *; }
-keepclassmembers class * implements com.getcapacitor.PluginMethod {
    public *;
}

# 2. Keep PBP Native Detection Services & Database Helpers
-keep class com.pbp.personalfinance.detection.** { *; }
-keepclassmembers class com.pbp.personalfinance.detection.** {
    public *;
    protected *;
}

# 3. WebView Javascript Interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# 4. Strip debugging metadata in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
}

-dontwarn org.apache.commons.**
-dontwarn com.google.android.gms.**
