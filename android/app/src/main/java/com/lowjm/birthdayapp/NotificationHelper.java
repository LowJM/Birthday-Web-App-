package com.lowjm.birthdayapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/**
 * Helper class for creating and managing notifications
 */
public class NotificationHelper {
    
    public static final String CHANNEL_ID = "birthday_notifications";
    public static final String CHANNEL_NAME = "Birthday Reminders";
    
    /**
     * Create notification channel (required for Android 8.0+)
     */
    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications for upcoming birthdays");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            
            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
    
    /**
     * Build a birthday notification
     */
    public static NotificationCompat.Builder buildBirthdayNotification(Context context, String name) {
        createNotificationChannel(context);
        
        return new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Birthday Reminder! 🎉")
                .setContentText("It's " + name + "'s birthday today!")
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText("It's " + name + "'s birthday today! Don't forget to wish them a happy birthday!"))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
    }
}
