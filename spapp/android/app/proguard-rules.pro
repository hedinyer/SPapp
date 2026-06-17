# WorkManager (workmanager plugin) — Room database must survive R8 shrinking.
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.InputMerger
-keep class androidx.work.** { *; }
-keep class androidx.work.impl.** { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }

# Room (WorkManager internal persistence)
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-keepclassmembers class * extends androidx.room.RoomDatabase {
    abstract ** createOpenHelper(androidx.room.DatabaseConfiguration);
    abstract ** createInvalidationTracker();
}

# AndroidX Startup (InitializationProvider chain)
-keep class androidx.startup.** { *; }
