# eGeez R8 rules. Capacitor loads plugins by class name (capacitor.plugins.json)
# and calls @PluginMethod methods by reflection from the JS bridge.

# Readable stack traces in Play Console (with the uploaded mapping.txt).
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,Exceptions
-keepattributes *Annotation*,RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-renamesourcefileattribute SourceFile

# Capacitor core + bridge
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Every plugin: annotated class, its @PluginMethod / @PermissionCallback / @ActivityCallback methods
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.NativePlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.PermissionCallback *;
    @com.getcapacitor.annotation.ActivityCallback *;
}

# Installed plugins (android/app/src/main/assets/capacitor.plugins.json)
-keep class com.capacitorjs.plugins.** { *; }            # app, filesystem, local-notifications, share, splash-screen, status-bar
-keep class com.getcapacitor.community.** { *; }         # in-app-review, keep-awake
-keep class ee.forgr.nativepurchases.** { *; }           # @capgo/native-purchases (Play Billing)

# Google Play Billing + In-App Review
-keep class com.android.billingclient.** { *; }
-dontwarn com.android.billingclient.**
-keep class com.google.android.play.core.** { *; }
-dontwarn com.google.android.play.core.**

# Local notifications: receivers are referenced from the manifest; keep their payload models
-keep class * extends android.content.BroadcastReceiver

# WebView JS interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Cordova (none installed today; harmless if added later via capacitor-cordova-android-plugins)
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# App entry
-keep class net.promisechain.fidelquest.MainActivity { *; }
