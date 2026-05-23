package com.lowjm.birthdayapp;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.core.app.NotificationCompat;
import android.app.NotificationManager;
import android.content.SharedPreferences;
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
 * Background worker that checks for birthdays daily and sends notifications.
 * 
 * Uses a Supabase RPC function (get_todays_birthdays) that runs with SECURITY DEFINER
 * so it bypasses RLS — the anon key has no user session in a background worker.
 */
public class BirthdayNotificationWorker extends Worker {
    
    private static final String PREFS_NAME = "birthday_app_prefs";
    private static final String KEY_LAST_CHECK = "last_check_date";
    private static final String TAG = "BirthdayWorker";
    
    public BirthdayNotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }
    
    @NonNull
    @Override
    public Result doWork() {
        try {
            Context context = getApplicationContext();
            
            Calendar today = Calendar.getInstance();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayDate = sdf.format(today.getTime());
            
            android.util.Log.d(TAG, "=== Birthday check starting for date: " + todayDate + " ===");
            
            // OneTimeWorkRequests (immediate checks) bypass deduplication
            boolean isImmediateCheck = getInputData().getBoolean("immediate_check", false);
            
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String lastCheckDate = prefs.getString(KEY_LAST_CHECK, "");
            
            // Check if user is logged in (synced from React app)
            String currentUserId = prefs.getString("current_user_id", null);
            if (currentUserId == null) {
                android.util.Log.d(TAG, "No user logged in, skipping background check");
                return Result.success();
            }
            
            if (!isImmediateCheck && todayDate.equals(lastCheckDate)) {
                android.util.Log.d(TAG, "Already checked birthdays today (periodic), skipping");
                return Result.success();
            }
            
            prefs.edit().putString(KEY_LAST_CHECK, todayDate).apply();
            
            queryAndNotifyBirthdays(context, todayDate, currentUserId);
            
            android.util.Log.d(TAG, "=== Birthday check completed ===");
            return Result.success();
            
        } catch (Exception e) {
            android.util.Log.e(TAG, "Error checking birthdays", e);
            return Result.retry();
        }
    }
    
    /**
     * Call the Supabase RPC function to get today's birthdays, then send notifications.
     */
    private void queryAndNotifyBirthdays(Context context, String todayDate, String userId) {
        try {
            String supabaseUrl = BuildConfig.SUPABASE_URL;
            String supabaseKey = BuildConfig.SUPABASE_ANON_KEY;
            
            android.util.Log.d(TAG, "SUPABASE_URL length: " + (supabaseUrl != null ? supabaseUrl.length() : "null"));
            android.util.Log.d(TAG, "SUPABASE_ANON_KEY length: " + (supabaseKey != null ? supabaseKey.length() : "null"));
            
            if (supabaseUrl == null || supabaseUrl.isEmpty() || supabaseKey == null || supabaseKey.isEmpty()) {
                android.util.Log.e(TAG, "ERROR: Supabase credentials not configured!");
                sendDebugNotification(context, "Birthday App: Supabase credentials not configured. Please rebuild with env vars set.");
                return;
            }
            
            // Call the RPC function instead of querying the table directly.
            // This bypasses RLS since the function uses SECURITY DEFINER.
            String rpcUrl = supabaseUrl + "/rest/v1/rpc/get_todays_birthdays";
            android.util.Log.d(TAG, "Calling Supabase RPC: " + rpcUrl + " for user: " + userId);
            
            JSONArray birthdays = callSupabaseRpc(rpcUrl, supabaseKey, userId);
            
            if (birthdays != null) {
                android.util.Log.d(TAG, "RPC returned " + birthdays.length() + " birthday(s) for today");
                
                for (int i = 0; i < birthdays.length(); i++) {
                    JSONObject birthday = birthdays.getJSONObject(i);
                    String name = birthday.getString("name");
                    
                    sendBirthdayNotification(context, name);
                    android.util.Log.d(TAG, ">> Sent notification for: " + name);
                }
                
                if (birthdays.length() == 0) {
                    android.util.Log.d(TAG, "No birthdays today");
                }
            } else {
                android.util.Log.w(TAG, "Supabase RPC returned null");
            }
            
        } catch (Exception e) {
            android.util.Log.e(TAG, "Error querying Supabase", e);
        }
    }
    
    /**
     * Call a Supabase RPC (POST) endpoint and return the JSON array result.
     */
    private JSONArray callSupabaseRpc(String urlString, String apiKey, String userId) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            connection.setRequestMethod("POST");
            connection.setRequestProperty("apikey", apiKey);
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            
            // RPC with user_id parameter
            String jsonBody = "{\"p_user_id\": \"" + userId + "\"}";
            OutputStream os = connection.getOutputStream();
            os.write(jsonBody.getBytes("UTF-8"));
            os.close();
            
            int responseCode = connection.getResponseCode();
            android.util.Log.d(TAG, "Supabase RPC response code: " + responseCode);
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                String response = readInputStream(connection.getInputStream());
                android.util.Log.d(TAG, "RPC response: " + response.substring(0, Math.min(response.length(), 500)));
                return new JSONArray(response);
            } else {
                try {
                    String errorBody = readInputStream(connection.getErrorStream());
                    android.util.Log.e(TAG, "Supabase RPC error: HTTP " + responseCode + " - " + errorBody);
                } catch (Exception e) {
                    android.util.Log.e(TAG, "Supabase RPC returned status: " + responseCode);
                }
                return null;
            }
            
        } finally {
            connection.disconnect();
        }
    }
    
    private String readInputStream(InputStream inputStream) throws Exception {
        Scanner scanner = new Scanner(inputStream).useDelimiter("\\A");
        return scanner.hasNext() ? scanner.next() : "";
    }
    
    private void sendBirthdayNotification(Context context, String name) {
        NotificationHelper.createNotificationChannel(context);
        
        NotificationCompat.Builder notificationBuilder = NotificationHelper.buildBirthdayNotification(context, name);
        int notificationId = name.hashCode();
        
        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        notificationManager.notify(notificationId, notificationBuilder.build());
        
        android.util.Log.d(TAG, "Notification posted with ID " + notificationId + " for " + name);
    }
    
    private void sendDebugNotification(Context context, String message) {
        NotificationHelper.createNotificationChannel(context);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, NotificationHelper.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("Birthday App - Setup Required")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
        
        NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
        notificationManager.notify(999999, builder.build());
    }
}
