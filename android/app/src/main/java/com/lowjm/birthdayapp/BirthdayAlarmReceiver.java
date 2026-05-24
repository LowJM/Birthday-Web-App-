package com.lowjm.birthdayapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.app.NotificationManager;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.Scanner;

/**
 * BroadcastReceiver triggered by AlarmManager at exactly 1:00 AM daily.
 * 
 * This runs even when the app is completely closed/killed because AlarmManager
 * operates at the OS level, unlike WorkManager which is deferrable.
 * 
 * Flow:
 * 1. AlarmManager fires at 1:00 AM → Android wakes CPU (RTC_WAKEUP)
 * 2. This receiver's onReceive() is called
 * 3. goAsync() extends the receiver's life beyond the default 10s
 * 4. WakeLock keeps CPU on during the ~2s network call
 * 5. Query Supabase for today's birthdays
 * 6. Send native notifications for matches
 * 7. Reschedule alarm for tomorrow 1:00 AM
 * 8. Release WakeLock
 */
public class BirthdayAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "BirthdayAlarm";
    private static final String PREFS_NAME = "birthday_app_prefs";
    private static final int ALARM_REQUEST_CODE = 1001;

    @Override
    public void onReceive(final Context context, Intent intent) {
        android.util.Log.d(TAG, "=== Alarm fired! Starting birthday check ===");

        // Acquire WakeLock to keep CPU running during network call
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        final PowerManager.WakeLock wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, "BirthdayApp:AlarmWakeLock");
        wakeLock.acquire(60 * 1000L); // 60 seconds max

        // goAsync() tells Android we need more than 10 seconds
        final PendingResult pendingResult = goAsync();

        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    checkBirthdaysAndNotify(context);
                } catch (Exception e) {
                    android.util.Log.e(TAG, "Error in alarm receiver", e);
                } finally {
                    // ALWAYS reschedule for tomorrow, even if check failed
                    scheduleNextAlarm(context);

                    // Release resources
                    if (wakeLock.isHeld()) {
                        wakeLock.release();
                    }
                    pendingResult.finish();
                    android.util.Log.d(TAG, "=== Alarm handler complete ===");
                }
            }
        }).start();
    }

    /**
     * Query Supabase and send notifications for today's birthdays.
     */
    private void checkBirthdaysAndNotify(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String currentUserId = prefs.getString("current_user_id", null);

        if (currentUserId == null) {
            android.util.Log.d(TAG, "No user logged in, skipping check");
            return;
        }

        String supabaseUrl = BuildConfig.SUPABASE_URL;
        String supabaseKey = BuildConfig.SUPABASE_ANON_KEY;

        if (supabaseUrl == null || supabaseUrl.isEmpty() || supabaseKey == null || supabaseKey.isEmpty()) {
            android.util.Log.e(TAG, "Supabase credentials not configured");
            return;
        }

        Calendar today = Calendar.getInstance();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        String todayDate = sdf.format(today.getTime());

        android.util.Log.d(TAG, "Checking birthdays for date: " + todayDate + ", user: " + currentUserId);

        try {
            String rpcUrl = supabaseUrl + "/rest/v1/rpc/get_todays_birthdays";
            JSONArray birthdays = callSupabaseRpc(rpcUrl, supabaseKey, currentUserId);

            if (birthdays != null && birthdays.length() > 0) {
                android.util.Log.d(TAG, "Found " + birthdays.length() + " birthday(s) today!");

                for (int i = 0; i < birthdays.length(); i++) {
                    JSONObject birthday = birthdays.getJSONObject(i);
                    String name = birthday.getString("name");

                    NotificationHelper.createNotificationChannel(context);
                    NotificationCompat.Builder builder = NotificationHelper.buildBirthdayNotification(context, name);
                    NotificationManager nm = context.getSystemService(NotificationManager.class);
                    nm.notify(name.hashCode(), builder.build());

                    android.util.Log.d(TAG, ">> Notification sent for: " + name);
                }
            } else {
                android.util.Log.d(TAG, "No birthdays today");
            }

            // Update last check date
            prefs.edit().putString("last_check_date", todayDate).apply();

        } catch (Exception e) {
            android.util.Log.e(TAG, "Error querying Supabase", e);
        }
    }

    /**
     * Call Supabase RPC endpoint.
     */
    private JSONArray callSupabaseRpc(String urlString, String apiKey, String userId) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setRequestProperty("apikey", apiKey);
            conn.setRequestProperty("Authorization", "Bearer " + apiKey);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);

            String jsonBody = "{\"p_user_id\": \"" + userId + "\"}";
            OutputStream os = conn.getOutputStream();
            os.write(jsonBody.getBytes("UTF-8"));
            os.close();

            int code = conn.getResponseCode();
            android.util.Log.d(TAG, "Supabase response: " + code);

            if (code == HttpURLConnection.HTTP_OK) {
                String response = readStream(conn.getInputStream());
                android.util.Log.d(TAG, "Response: " + response.substring(0, Math.min(response.length(), 300)));
                return new JSONArray(response);
            } else {
                try {
                    String err = readStream(conn.getErrorStream());
                    android.util.Log.e(TAG, "Supabase error: HTTP " + code + " - " + err);
                } catch (Exception e) {
                    android.util.Log.e(TAG, "Supabase error: HTTP " + code);
                }
                return null;
            }
        } finally {
            conn.disconnect();
        }
    }

    private String readStream(InputStream is) throws Exception {
        Scanner s = new Scanner(is).useDelimiter("\\A");
        return s.hasNext() ? s.next() : "";
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
