package com.lowjm.birthdayapp;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

/**
 * Service to manage WorkManager scheduling for birthday notifications
 * Handles scheduling and cancellation of background tasks
 */
public class NotificationService {
    
    private static final String WORK_TAG = "birthday_notification_work";
    private static final long CHECK_INTERVAL_HOURS = 24; // Check daily
    
    /**
     * Schedule daily birthday check
     * This will check for birthdays every day
     */
    public static void scheduleNotificationCheck(Context context) {
        try {
            // Create constraints for the work
            // The work will only run when:
            // - Device has network connectivity
            // - Device battery is not critically low
            Constraints constraints = new Constraints.Builder()
                    .setRequiresBatteryNotLow(true)
                    .build();
            
            // Create periodic work request to run every 24 hours
            PeriodicWorkRequest birthdayCheckRequest =
                    new PeriodicWorkRequest.Builder(
                            BirthdayNotificationWorker.class,
                            CHECK_INTERVAL_HOURS,
                            TimeUnit.HOURS
                    )
                    .setConstraints(constraints)
                    .addTag(WORK_TAG)
                    .build();
            
            // Schedule the work with REPLACE policy to avoid duplicate work
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    WORK_TAG,
                    ExistingPeriodicWorkPolicy.REPLACE,
                    birthdayCheckRequest
            );
            
            android.util.Log.d("NotificationService", "Birthday check scheduled successfully");
            
        } catch (Exception e) {
            android.util.Log.e("NotificationService", "Failed to schedule birthday check", e);
        }
    }
    
    /**
     * Cancel all scheduled birthday notification checks
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
     * Trigger an immediate check (useful for testing or forcing a check right now).
     * This bypasses the daily deduplication check.
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
}
