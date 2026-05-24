package com.lowjm.birthdayapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/**
 * BroadcastReceiver triggered by AlarmManager at exactly 1:00 AM daily.
 * 
 * Flow:
 * 1. AlarmManager fires at 1:00 AM → Android wakes CPU (RTC_WAKEUP)
 * 2. Hand off network call to WorkManager so it respects Battery Saver 
 *    (WorkManager will wait until network is unblocked by OS).
 * 3. Reschedule alarm for tomorrow 1:00 AM.
 */
public class BirthdayAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "BirthdayAlarm";
    private static final int ALARM_REQUEST_CODE = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        android.util.Log.d(TAG, "=== Alarm fired! Queuing work ===");

        // Hand off to WorkManager. If phone is in Battery Saver, WorkManager
        // will safely wait until the network is available before executing.
        NotificationService.triggerBackgroundCheck(context);

        // ALWAYS reschedule for tomorrow
        scheduleNextAlarm(context);
        
        android.util.Log.d(TAG, "=== Alarm handler complete ===");
    }

    // ==================== STATIC SCHEDULING METHODS ====================

    /**
     * Schedule the daily alarm for 1:00 AM using AlarmManager.
     * Uses setExactAndAllowWhileIdle() to fire through Doze mode.
     */
    public static void scheduleNextAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        // Check exact alarm permission on Android 12+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                android.util.Log.w(TAG, "Cannot schedule exact alarms — permission not granted. Falling back to inexact.");
                scheduleInexactAlarm(context, alarmManager);
                return;
            }
        }

        Intent intent = new Intent(context, BirthdayAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, ALARM_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Calculate next 1:00 AM
        Calendar target = Calendar.getInstance();
        target.set(Calendar.HOUR_OF_DAY, 1);
        target.set(Calendar.MINUTE, 0);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        // If 1 AM already passed today, schedule for tomorrow
        if (target.getTimeInMillis() <= System.currentTimeMillis()) {
            target.add(Calendar.DAY_OF_YEAR, 1);
        }

        alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                target.getTimeInMillis(),
                pendingIntent
        );

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        android.util.Log.d(TAG, "Exact alarm scheduled for: " + sdf.format(target.getTime()));
    }

    /**
     * Fallback: schedule inexact alarm if exact alarm permission denied.
     */
    private static void scheduleInexactAlarm(Context context, AlarmManager alarmManager) {
        Intent intent = new Intent(context, BirthdayAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, ALARM_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Calendar target = Calendar.getInstance();
        target.set(Calendar.HOUR_OF_DAY, 1);
        target.set(Calendar.MINUTE, 0);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        if (target.getTimeInMillis() <= System.currentTimeMillis()) {
            target.add(Calendar.DAY_OF_YEAR, 1);
        }

        // setAndAllowWhileIdle is inexact but doesn't require permission
        alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                target.getTimeInMillis(),
                pendingIntent
        );

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
        android.util.Log.d(TAG, "Inexact alarm scheduled for: " + sdf.format(target.getTime()));
    }

    /**
     * Cancel the daily alarm.
     */
    public static void cancelAlarm(Context context) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, BirthdayAlarmReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context, ALARM_REQUEST_CODE, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        if (alarmManager != null) {
            alarmManager.cancel(pendingIntent);
        }
    }
}
