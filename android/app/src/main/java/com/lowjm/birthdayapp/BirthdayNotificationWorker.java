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
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;
import java.util.Scanner;

/**
 * Background worker that checks for birthdays daily and sends notifications
 * This worker is triggered by WorkManager according to the schedule defined in NotificationService
 * 
 * It queries Supabase REST API to get birthdays for today and sends notifications for matches.
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
            
            // Get today's date
            Calendar today = Calendar.getInstance();
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            String todayDate = sdf.format(today.getTime());
            
            // Check if we've already sent notifications today
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String lastCheckDate = prefs.getString(KEY_LAST_CHECK, "");
            
            if (todayDate.equals(lastCheckDate)) {
                // Already checked today, no need to check again
                android.util.Log.d(TAG, "Already checked birthdays today");
                return Result.success();
            }
            
            // Update last check date
            prefs.edit().putString(KEY_LAST_CHECK, todayDate).apply();
            
            // Query Supabase for birthdays matching today
            queryAndNotifyBirthdays(context, todayDate);
            
            return Result.success();
            
        } catch (Exception e) {
            // Log the error
            android.util.Log.e(TAG, "Error checking birthdays", e);
            
            // Retry the task
            return Result.retry();
        }
    }
    
    /**
     * Query Supabase for birthdays matching today's month and day
     * Then send notifications for each match
     */
    private void queryAndNotifyBirthdays(Context context, String todayDate) {
        try {
            // Extract month and day from today's date (YYYY-MM-DD)
            String[] parts = todayDate.split("-");
            String month = parts[1];  // MM
            String day = parts[2];    // DD
            
            // Get Supabase credentials from BuildConfig (you'll need to add these)
            String supabaseUrl = BuildConfig.SUPABASE_URL;
            String supabaseKey = BuildConfig.SUPABASE_ANON_KEY;
            
            if (supabaseUrl == null || supabaseKey == null) {
                android.util.Log.w(TAG, "Supabase credentials not configured");
                return;
            }
            
            // Build the query to get all birthdays
            // We fetch all and filter locally because SQL LIKE on dates is complex
            String query = String.format("%s/rest/v1/birthdays?select=id,name,birth_date", supabaseUrl);
            
            // Fetch birthdays from Supabase
            JSONArray birthdays = fetchBirthdaysFromSupabase(query, supabaseKey);
            
            if (birthdays != null) {
                // Filter for today's birthdays and send notifications
                for (int i = 0; i < birthdays.length(); i++) {
                    JSONObject birthday = birthdays.getJSONObject(i);
                    String birthDate = birthday.getString("birth_date"); // Format: YYYY-MM-DD
                    String name = birthday.getString("name");
                    
                    // Check if this birthday matches today (compare month and day only)
                    if (isBirthdayToday(birthDate, month, day)) {
                        sendBirthdayNotification(context, name);
                        android.util.Log.d(TAG, "Sent notification for " + name);
                    }
                }
            }
            
        } catch (Exception e) {
            android.util.Log.e(TAG, "Error querying Supabase", e);
        }
    }
    
    /**
     * Fetch birthdays from Supabase REST API
     */
    private JSONArray fetchBirthdaysFromSupabase(String urlString, String apiKey) throws Exception {
        URL url = new URL(urlString);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        try {
            // Set request headers
            connection.setRequestMethod("GET");
            connection.setRequestProperty("apikey", apiKey);
            connection.setRequestProperty("Authorization", "Bearer " + apiKey);
            connection.setConnectTimeout(10000); // 10 seconds
            connection.setReadTimeout(10000);
            
            // Execute request
            int responseCode = connection.getResponseCode();
            android.util.Log.d(TAG, "Supabase API response code: " + responseCode);
            
            if (responseCode == HttpURLConnection.HTTP_OK) {
                // Read response
                String response = readInputStream(connection.getInputStream());
                return new JSONArray(response);
            } else {
                android.util.Log.w(TAG, "Supabase API returned status: " + responseCode);
                return null;
            }
            
        } finally {
            connection.disconnect();
        }
    }
    
    /**
     * Read input stream to string
     */
    private String readInputStream(InputStream inputStream) throws Exception {
        Scanner scanner = new Scanner(inputStream).useDelimiter("\\A");
        return scanner.hasNext() ? scanner.next() : "";
    }
    
    /**
     * Check if the given birth_date matches today's month and day
     * 
     * @param birthDate Format: YYYY-MM-DD
     * @param todayMonth Format: MM (01-12)
     * @param todayDay Format: DD (01-31)
     * @return true if month and day match
     */
    private boolean isBirthdayToday(String birthDate, String todayMonth, String todayDay) {
        try {
            String[] parts = birthDate.split("-");
            if (parts.length >= 3) {
                String birthMonth = parts[1]; // MM
                String birthDay = parts[2];   // DD
                
                return birthMonth.equals(todayMonth) && birthDay.equals(todayDay);
            }
        } catch (Exception e) {
            android.util.Log.e(TAG, "Error parsing birth date: " + birthDate, e);
        }
        return false;
    }
    
    /**
     * Helper method to send a notification for a specific person
     */
    private void sendBirthdayNotification(Context context, String name) {
        NotificationHelper.createNotificationChannel(context);
        
        NotificationCompat.Builder notificationBuilder = NotificationHelper.buildBirthdayNotification(context, name);
        
        // Generate a unique notification ID based on the name
        int notificationId = name.hashCode();
        
        NotificationManager notificationManager = 
                context.getSystemService(NotificationManager.class);
        notificationManager.notify(notificationId, notificationBuilder.build());
    }
}
