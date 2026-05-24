package com.lowjm.birthdayapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BroadcastReceiver that runs on device boot to reschedule the daily alarm.
 * 
 * AlarmManager alarms are CLEARED on device reboot, so we must re-register
 * the 1:00 AM exact alarm every time the device boots.
 */
public class BootReceiver extends BroadcastReceiver {
    
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction() != null && intent.getAction().equals(Intent.ACTION_BOOT_COMPLETED)) {
            android.util.Log.d("BootReceiver", "Device boot detected — rescheduling birthday alarm");
            BirthdayAlarmReceiver.scheduleNextAlarm(context);
        }
    }
}
