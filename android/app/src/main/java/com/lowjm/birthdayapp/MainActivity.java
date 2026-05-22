package com.lowjm.birthdayapp;

import androidx.appcompat.app.AppCompatActivity;
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
import androidx.activity.OnBackPressedCallback;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "BirthdayApp";
    private WebView webView;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Switch theme from splash BEFORE super.onCreate() so the splash drawable is removed
        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);
        
        // Remove any lingering splash background
        Window window = getWindow();
        window.setBackgroundDrawable(null);
        
        // Initialize WorkManager for birthday notifications
        try {
            NotificationService.scheduleNotificationCheck(this);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule notifications: " + e.getMessage());
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
    
    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }
}
