package com.lowjm.birthdayapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BroadcastReceiver that runs on device boot to reschedule notifications
 * Ensures birthday checks resume after device restart
 */
public class BootReceiver extends BroadcastReceiver {
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction() != null && intent.getAction().equals(Intent.ACTION_BOOT_COMPLETED)) {
            // Device has booted, reschedule the notification checks
            NotificationService.scheduleNotificationCheck(context);
            android.util.Log.d("BootReceiver", "Device boot detected, rescheduling notifications");
        }
    }
}
