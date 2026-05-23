package com.lowjm.birthdayapp;

import androidx.appcompat.app.AppCompatActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.net.Uri;
import android.util.Log;
import android.view.View;
import android.view.Window;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "BirthdayApp";
    private WebView webView;
    
    // Modern permission launcher for notification permission (Android 13+)
    private final ActivityResultLauncher<String> notificationPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                if (isGranted) {
                    Log.d(TAG, "Notification permission GRANTED");
                } else {
                    Log.w(TAG, "Notification permission DENIED by user");
                }
                // Schedule WorkManager regardless — it will queue notifications
                // and they'll appear once permission is granted
                scheduleWorker();
            });
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Switch theme from splash BEFORE super.onCreate() so the splash drawable is removed
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        
        // Remove any lingering splash background
        Window window = getWindow();
        window.setBackgroundDrawable(null);
        
        // Request notification permission (Android 13+) or schedule directly
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.d(TAG, "Requesting POST_NOTIFICATIONS permission...");
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            } else {
                Log.d(TAG, "Notification permission already granted");
                scheduleWorker();
            }
        } else {
            // Android 12 and below: no runtime permission needed
            Log.d(TAG, "Android < 13: no notification permission needed");
            scheduleWorker();
        }
        
        // Load React web app in WebView
        webView = new WebView(this);
        webView.setBackgroundColor(0xFF000000); // Prevent white flash
        
        // Enable JavaScript and storage
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setAllowFileAccess(true);
        webView.getSettings().setAllowContentAccess(true);
        webView.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Allow file access from file URLs (needed for local assets)
        webView.getSettings().setAllowFileAccessFromFileURLs(true);
        webView.getSettings().setAllowUniversalAccessFromFileURLs(true);
        
        // Set clients with proper error handling
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                Log.d(TAG, "WebView page started: " + url);
                super.onPageStarted(view, url, favicon);
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                Log.d(TAG, "WebView page finished: " + url);
                // Ensure WebView is visible after page loads
                view.setVisibility(View.VISIBLE);
                super.onPageFinished(view, url);
            }
            
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                Log.e(TAG, "WebView error loading " + request.getUrl() + 
                    ": [" + error.getErrorCode() + "] " + error.getDescription());
                super.onReceivedError(view, request, error);
            }
            
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                // Only allow file and https schemes, open others externally
                if ("file".equals(scheme) || "https".equals(scheme) || "http".equals(scheme)) {
                    return false; // Let WebView handle it
                }
                return true; // Block other schemes
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                Log.d(TAG, "WebView console [" + consoleMessage.messageLevel() + "]: " 
                    + consoleMessage.message() 
                    + " -- From line " + consoleMessage.lineNumber() 
                    + " of " + consoleMessage.sourceId());
                return true;
            }
        });
        
        // Load the web app from assets
        String url = "file:///android_asset/public/index.html";
        Log.d(TAG, "Loading WebView URL: " + url);
        webView.loadUrl(url);
        // Setup Javascript Interface for auth state sync
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");
        
        setContentView(webView);
        
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
    
    /**
     * Schedule the WorkManager periodic check and also fire an immediate one-time check.
     * The immediate check ensures users get a notification right after installing/opening the app
     * if today is someone's birthday.
     */
    private void scheduleWorker() {
        try {
            NotificationService.scheduleNotificationCheck(this);
            // Also fire an immediate one-time check so the user doesn't have to wait 24h
            NotificationService.triggerImmediateCheck(this);
            Log.d(TAG, "WorkManager scheduled + immediate check triggered");
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule notifications: " + e.getMessage());
        }
    }
    
    /**
     * Interface to receive data from the React app (WebView)
     */
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @android.webkit.JavascriptInterface
        public void setUserId(String userId) {
            SharedPreferences prefs = mContext.getSharedPreferences("birthday_app_prefs", Context.MODE_PRIVATE);
            prefs.edit().putString("current_user_id", userId).apply();
            Log.d(TAG, "React sent user_id: " + userId);
        }

        @android.webkit.JavascriptInterface
        public void clearUserId() {
            SharedPreferences prefs = mContext.getSharedPreferences("birthday_app_prefs", Context.MODE_PRIVATE);
            prefs.edit().remove("current_user_id").apply();
            Log.d(TAG, "React cleared user_id");
        }
    }
    
    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
