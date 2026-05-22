# Quick Setup Guide: WorkManager + Supabase Integration

This guide walks you through setting up the new automatic birthday notification system.

## What's New

Your app now automatically checks for birthdays **every 24 hours** using Android WorkManager, even when the app is closed. The checks query Supabase and send notifications automatically. **Capacitor has been removed** — the app is now pure React + WorkManager.

## Prerequisites

- ✅ Supabase project already set up (you have this)
- ✅ Android development environment
- ✅ Your Supabase URL and anon key
- ✅ Java 11+ (for Gradle builds, no Java 21 requirement anymore)

## Setup Steps

### 1. Find Your Supabase Credentials (2 minutes)

Go to [app.supabase.com](https://app.supabase.com):

1. Open your project
2. Click **Settings** (gear icon)
3. Go to **API** section
4. Copy:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **anon public** key

### 2. Set Environment Variables

Choose your platform:

#### Windows (PowerShell)

```powershell
[Environment]::SetEnvironmentVariable("SUPABASE_URL", "https://your-project.supabase.co", "User")
[Environment]::SetEnvironmentVariable("SUPABASE_ANON_KEY", "your-key-here", "User")

# Restart your IDE or PowerShell for changes to take effect
```

#### Windows (Command Prompt)

```cmd
setx SUPABASE_URL "https://your-project.supabase.co"
setx SUPABASE_ANON_KEY "your-key-here"

# Restart your IDE or terminal
```

#### macOS/Linux

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-key-here"

# Make permanent:
echo 'export SUPABASE_URL="https://your-project.supabase.co"' >> ~/.zshrc
echo 'export SUPABASE_ANON_KEY="your-key-here"' >> ~/.zshrc
source ~/.zshrc
```

### 3. Install Web Dependencies

```bash
npm install
```

### 4. Build Web Assets

```bash
npm run build
```

This compiles the React app into `dist/`. The Vite config uses `base: './'` to generate relative paths compatible with Android WebView.

### 5. Copy Web Build to Android Assets

```bash
# Remove old assets and copy fresh build
Remove-Item -Path android\app\src\main\assets\public -Recurse -Force
New-Item -Path android\app\src\main\assets\public -ItemType Directory -Force
Copy-Item -Path dist\* -Destination android\app\src\main\assets\public\ -Recurse -Force
```

> **Critical**: The React app runs inside an Android WebView. If you skip this step, the app will show a blank screen.

### 6. Build Android App

```bash
cd android
./gradlew clean build
```

Or in Android Studio: **Build → Clean Project → Rebuild Project**

### 5. Deploy/Run

#### Option A: Test in Android Studio

```bash
# Open Android Studio directly
# File → Open → select android/ folder
# Click Run (or Shift+F10)
```

#### Option B: Deploy to connected device

```bash
cd android
./gradlew installDebug
```

## Verification

### Test 1: Add a Birthday for Today

1. Open the app in your browser: `npm run dev` (http://localhost:3000)
2. Add a birthday for today's date (e.g., `2026-05-22`)
3. Install the Android APK on a device
4. Wait for WorkManager to run (or check logs to see it running)
5. You should see a notification

### Test 2: Check WorkManager is Active

```bash
adb shell dumpsys jobscheduler | grep birthday
```

You should see scheduled work listed.

### Test 3: Check Logs

```bash
adb logcat | grep "BirthdayWorker"
```

Look for:
- `Supabase API response code: 200` ✅
- `Sent notification for [name]` ✅

## How It All Works Together

```
┌─────────────────────────────────────────────────┐
│  Your Birthday App                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  Web App (React)        Mobile App (Android)    │
│  ├─ Add birthdays       ├─ WorkManager (daily)  │
│  ├─ Manage data         ├─ Query Supabase       │
│  └─ Sync to Supabase    └─ Send notifications   │
│                                                 │
│           Supabase Database                     │
│         (Birthdays stored here)                 │
│                                                 │
│  GitHub Actions                                 │
│  └─ Ping Supabase (Mon/Thu) ← Keeps it active  │
└─────────────────────────────────────────────────┘
```

## Timeline

- **When you open the app**: WorkManager is scheduled
- **Every 24 hours**: Background check runs automatically
- **Match found**: Notification sent (even if app is closed)
- **Device restarts**: Checks resume automatically
- **Every Mon/Thu**: GitHub Actions pings database to keep it active

## Troubleshooting

### "Supabase credentials not configured"

**Solution**: 
1. Check environment variables are set: `echo $SUPABASE_URL`
2. Rebuild: `./gradlew clean build`
3. Restart IDE/terminal

### No notifications appear

**Solution**:
1. Check logs: `adb logcat | grep BirthdayWorker`
2. Verify birthday date format: `YYYY-MM-DD`
3. Make sure date matches today
4. Check notification permissions are granted in app settings

### "API response code: 401"

**Solution**:
1. Check your anon key is correct in Supabase Dashboard
2. Verify it's the "anon public" key, not service role
3. Rebuild and redeploy

### App crashes on startup

**Solution**:
1. Check build succeeded: `./gradlew clean build`
2. Check for Java errors in build output
3. Verify environment variables are set correctly

## Files Changed

- ✅ **android/app/build.gradle** - WorkManager dependencies + Supabase credential injection
- ✅ **android/app/src/main/AndroidManifest.xml** - BootReceiver registration
- ✅ **android/app/src/main/java/** - 5 Java files:
  - NotificationHelper.java
  - BirthdayNotificationWorker.java
  - NotificationService.java
  - BootReceiver.java
  - MainActivity.java (WebView + theme switch + WorkManager init)
- ✅ **vite.config.ts** - Added `base: './'` for Android WebView
- ✅ **src/lib/supabase.ts** - Uses localStorage instead of Capacitor Preferences
- ✅ **package.json** - No Capacitor dependencies
- ✅ **.github/workflows/build-android.yml** - CI/CD workflow

## Architecture Changes

**Old (Capacitor-based):**
```
React → Capacitor Bridge → LocalNotifications Plugin → Android
```

**New (WebView + WorkManager):**
```
React ──[Vite build]──► dist/ ──[copy]──► Android assets/public/
                                       │
                                 Android WebView
                                       │
Android WorkManager ← Queries Supabase directly via HTTP
         │
Notifications sent automatically
```

## Documentation

- 📖 **WORKMANAGER_IMPLEMENTATION.md** - Technical deep dive
- 📖 **SUPABASE_INTEGRATION.md** - Database integration guide
- 📖 **README.md** - Updated project overview

## Next Steps

1. ✅ Set environment variables
2. ✅ Install dependencies: `npm install`
3. ✅ Rebuild Android app: `./gradlew clean build`
4. ✅ Test web app: `npm run dev`
5. ✅ Install APK on device
6. ✅ Test with a today's birthday
7. ✅ Verify logs show "Sent notification"
8. 🚀 Deploy!

## Questions?

Check the detailed docs:
- Notifications not working? → **SUPABASE_INTEGRATION.md**
- Want more technical details? → **WORKMANAGER_IMPLEMENTATION.md**
- Need help with Supabase? → Check **SUPABASE.md**
