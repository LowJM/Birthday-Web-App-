package com.lowjm.birthdayapp;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.Calendar;
import java.util.concurrent.TimeUnit;

/**
 * Service to manage WorkManager scheduling for birthday notifications.
 * Schedules a daily background check that queries Supabase and sends notifications.
 */
public class NotificationService {
    
    private static final String WORK_TAG = "birthday_notification_work";
    private static final long CHECK_INTERVAL_HOURS = 24;
    
    /**
     * Schedule daily birthday check.
     * Uses KEEP policy so reopening the app does NOT reset the 24h timer.
     * Only creates a new schedule if one doesn't already exist.
     */
    public static void scheduleNotificationCheck(Context context) {
        try {
            // Only require network (need internet for Supabase query)
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();
            
            // Calculate delay to target ~1:00 AM
            long initialDelayMinutes = calculateDelayTo1AM();
            
            PeriodicWorkRequest birthdayCheckRequest =
                    new PeriodicWorkRequest.Builder(
                            BirthdayNotificationWorker.class,
                            CHECK_INTERVAL_HOURS,
                            TimeUnit.HOURS
                    )
                    .setConstraints(constraints)
                    .setInitialDelay(initialDelayMinutes, TimeUnit.MINUTES)
                    .addTag(WORK_TAG)
                    .build();
            
            // KEEP = don't replace existing schedule, only create if none exists
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_TAG,
                    ExistingPeriodicWorkPolicy.KEEP,
                    birthdayCheckRequest
            );
            
            android.util.Log.d("NotificationService", 
                "Birthday check scheduled (KEEP policy). Initial delay: " + initialDelayMinutes + " minutes (~1 AM)");
            
        } catch (Exception e) {
            android.util.Log.e("NotificationService", "Failed to schedule birthday check", e);
        }
    }
    
    /**
     * Calculate minutes until next 1:00 AM.
     */
    private static long calculateDelayTo1AM() {
        Calendar now = Calendar.getInstance();
        Calendar target = Calendar.getInstance();
        target.set(Calendar.HOUR_OF_DAY, 1);
        target.set(Calendar.MINUTE, 0);
        target.set(Calendar.SECOND, 0);
        
        // If 1 AM already passed today, schedule for tomorrow
        if (now.after(target)) {
            target.add(Calendar.DAY_OF_MONTH, 1);
        }
        
        long diffMs = target.getTimeInMillis() - now.getTimeInMillis();
        return diffMs / (60 * 1000);
    }
    
    /**
     * Cancel all scheduled birthday notification checks.
     */
    public static void cancelNotificationCheck(Context context) {
        try {
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG);
            android.util.Log.d("NotificationService", "Birthday check cancelled");
        } catch (Exception e) {
            android.util.Log.e("NotificationService", "Failed to cancel birthday check", e);
        }
    }
    
    /**
     * Trigger an immediate one-time check (bypasses deduplication).
     * Used on app open so user gets instant notification if birthday today.
     */
    public static void triggerImmediateCheck(Context context) {
        try {
            androidx.work.Data inputData = new androidx.work.Data.Builder()
                    .putBoolean("immediate_check", true)
                    .build();
            
            androidx.work.OneTimeWorkRequest immediateRequest = 
                    new androidx.work.OneTimeWorkRequest.Builder(BirthdayNotificationWorker.class)
                            .setInputData(inputData)
                            .build();
            
            WorkManager.getInstance(context).enqueue(immediateRequest);
            android.util.Log.d("NotificationService", "Immediate birthday check triggered (bypasses dedup)");
            
        } catch (Exception e) {
            android.util.Log.e("NotificationService", "Failed to trigger immediate check", e);
        }
    }

    /**
     * Trigger a background check queued by the AlarmManager.
     * Uses network constraints so WorkManager will wait if Battery Saver blocks network.
     */
    public static void triggerBackgroundCheck(Context context) {
        try {
            Constraints constraints = new Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build();

            androidx.work.OneTimeWorkRequest bgRequest = 
                    new androidx.work.OneTimeWorkRequest.Builder(BirthdayNotificationWorker.class)
                            .setConstraints(constraints)
                            .build(); // immediate_check is false by default, so it uses deduplication
            
            WorkManager.getInstance(context).enqueue(bgRequest);
            android.util.Log.d("NotificationService", "Background birthday check queued to WorkManager");
            
        } catch (Exception e) {
            android.util.Log.e("NotificationService", "Failed to queue background check", e);
        }
    }
}
