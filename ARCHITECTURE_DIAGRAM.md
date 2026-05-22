# Complete System Architecture Diagram

## High-Level System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BIRTHDAY APP SYSTEM                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│    React Frontend    │         │   Supabase Cloud     │
│                      │         │                      │
│  - Add birthdays     │◄───────►│  - Birthdays table   │
│  - Manage list       │  REST   │  - Authentication    │
│  - UI                │  API    │  - Auth DB           │
└──────────────────────┘         └──────────────────────┘
         │                                  ▲
         │ npm run dev                      │ GitHub Actions
         │ npm run build                    │ keepalive.yml
         │                                  │ (Mon/Thu)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MOBILE APP (Android WebView)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Vite Build Output (dist/)                   │   │
│  │  - index.html + JS bundle + CSS bundle                  │   │
│  │  - Copied to android/app/src/main/assets/public/        │   │
│  │  - base: './' ensures relative paths for file://        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MainActivity (App Entry Point)              │   │
│  │  ├─ setTheme() — clears splash screen                   │   │
│  │  ├─ Creates WebView with JS + DOM Storage enabled       │   │
│  │  ├─ Loads file:///android_asset/public/index.html       │   │
│  │  └─ Initializes WorkManager for notifications           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              ANDROID NATIVE LAYER                     │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │                                                       │      │
│  │  ┌─────────────────────────────────────────────────┐ │      │
│  │  │  NotificationService (Manager)                  │ │      │
│  │  │  ├─ scheduleNotificationCheck()                 │ │      │
│  │  │    └─ Creates PeriodicWorkRequest               │ │      │
│  │  ├─ cancelNotificationCheck()                       │ │      │
│  │  └─ triggerImmediateCheck()                         │ │      │
│  │     └─ Creates OneTimeWorkRequest                   │ │      │
│  │                      │                                │      │
│  │                      ▼                                │      │
│  │  ┌─────────────────────────────────────────────────┐ │      │
│  │  │  WorkManager (Android Framework)                │ │      │
│  │  │  ├─ Schedules background tasks                 │ │      │
│  │  │  ├─ Respects constraints (battery, etc)        │ │      │
│  │  │  ├─ Survives device reboot                     │ │      │
│  │  │  └─ Daily execution                            │ │      │
│  │  └─────────────────────────────────────────────────┘ │      │
│  │                      │                                │      │
│  │                      ▼                                │      │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │  BirthdayNotificationWorker (Daily Task)        │ │     │
│  │  │  ├─ doWork()                                    │ │     │
│  │  │  │  ├─ Get today's date                         │ │     │
│  │  │  │  ├─ Query Supabase REST API via HTTP         │ │     │
│  │  │  │  │  └─ Fetch all birthdays                   │ │     │
│  │  │  │  ├─ Filter for today (month == month,        │ │     │
│  │  │  │  │                   day == day)             │ │     │
│  │  │  │  ├─ For each match: send notification       │ │     │
│  │  │  │  └─ Store check date in SharedPreferences   │ │     │
│  │  │  └─ Return Result.success()                    │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │                      │                                │      │
│  │                      ▼                                │      │
│  │  ┌──────────────────────────────────────────────────┐ │     │
│  │  │  NotificationHelper (Utility)                    │ │     │
│  │  │  ├─ createNotificationChannel()                 │ │     │
│  │  │  │  └─ Android 8.0+ required                    │ │     │
│  │  │  └─ buildBirthdayNotification()                 │ │     │
│  │  │     └─ Returns NotificationCompat.Builder       │ │     │
│  │  └──────────────────────────────────────────────────┘ │     │
│  │                      │                                │      │
│  │                      ▼                                │      │
│  │  ┌─────────────────────────────────────────────────┐ │      │
│  │  │  NotificationManager (Android Framework)        │ │      │
│  │  │  ├─ notify(id, notification)                    │ │      │
│  │  │  └─ Display to user                             │ │      │
│  │  └─────────────────────────────────────────────────┘ │      │
│  │                                                       │      │
│  │  ┌─────────────────────────────────────────────────┐ │      │
│  │  │  BootReceiver (BroadcastReceiver)               │ │      │
│  │  │  ├─ Listens for: android.intent.action.BOOT    │ │      │
│  │  │  ├─ _COMPLETED                                  │ │      │
│  │  │  └─ Calls: NotificationService.schedule...()    │ │      │
│  │  └─────────────────────────────────────────────────┘ │      │
│  │       (Ensures notifications restart after reboot)    │      │
│  │                                                       │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                          │
         └──────────────────────────┘
                    │
                    ▼
      ┌──────────────────────────┐
      │   System Notification    │
      │   "Birthday Reminder!"   │
      │  "It's Jane's birthday!  │
      │    Don't forget to call! │
      └──────────────────────────┘
```

## Data Flow: Daily Notification Check

```
START: WorkManager triggers daily
   │
   ▼
BirthdayNotificationWorker.doWork()
   │
   ├─ Get today's date (e.g., 2026-05-22)
   │
   ├─ Check SharedPreferences
   │  ├─ If checked today: RETURN SUCCESS
   │  └─ If not checked: CONTINUE
   │
   ├─ Mark date as checked
   │
   ▼
queryAndNotifyBirthdays("2026-05-22")
   │
   ├─ Extract month: "05"
   ├─ Extract day: "22"
   │
   ▼
fetchBirthdaysFromSupabase()
   │
   ├─ URL: {SUPABASE_URL}/rest/v1/birthdays
   │
   ├─ Headers:
   │  ├─ apikey: {SUPABASE_ANON_KEY}
   │  └─ Authorization: Bearer {SUPABASE_ANON_KEY}
   │
   ▼
HTTP GET to Supabase ──► Supabase API
                           │
                           ├─ Query birthdays table
                           │
                           ▼
                        Return JSON:
                        [
                          {
                            "id": "abc123",
                            "name": "Jane",
                            "birth_date": "1990-05-22"
                          },
                          {
                            "id": "def456",
                            "name": "John",
                            "birth_date": "1988-06-15"
                          }
                        ]
   │
   ◄──────────────────────┘
   │
   ▼
Parse JSON response
   │
   ▼
For each birthday in response:
   │
   ├─ isBirthdayToday(birth_date, "05", "22")
   │  │
   │  ├─ Extract month from birth_date: "05"
   │  ├─ Extract day from birth_date: "22"
   │  │
   │  ├─ If "05" == "05" AND "22" == "22": ✓ MATCH
   │  └─ If no match: SKIP to next
   │
   ├─ sendBirthdayNotification("Jane")
   │  │
   │  ├─ NotificationHelper.buildBirthdayNotification()
   │  │
   │  ├─ Create NotificationCompat.Builder
   │  │  ├─ Title: "Birthday Reminder! 🎉"
   │  │  ├─ Text: "It's Jane's birthday today!"
   │  │  └─ Other properties
   │  │
   │  ├─ NotificationManager.notify(hashCode, notification)
   │  │
   │  ▼
   │  System displays notification to user
   │
   └─ Continue loop for next birthday
   │
   ▼
Return Result.success()
   │
   ▼
END: WorkManager reschedules for tomorrow
```

## File Structure

```
Birthday App/
├── src/
│   ├── App.tsx              ← Main React component
│   └── lib/
│       └── supabase.ts      ← Supabase client (localStorage auth)
│
├── vite.config.ts           ← base: './' for Android WebView compatibility
│
├── android/
│   ├── build.gradle         ← Root build config
│   ├── settings.gradle      ← include ':app' only (no Capacitor)
│   ├── variables.gradle     ← SDK versions
│   │
│   └── app/
│       ├── build.gradle     ← Dependencies + env vars injection
│       │
│       └── src/main/
│           ├── AndroidManifest.xml  ← Permissions + BootReceiver
│           │
│           ├── assets/
│           │   └── public/          ← Vite build output copied here
│           │       ├── index.html
│           │       └── assets/
│           │           ├── index-*.js
│           │           └── index-*.css
│           │
│           ├── res/
│           │   ├── layout/
│           │   │   └── activity_main.xml
│           │   └── values/
│           │       └── styles.xml   ← Splash + NoActionBar themes
│           │
│           └── java/com/lowjm/birthdayapp/
│               ├── MainActivity.java               ← WebView + theme switch
│               ├── BirthdayNotificationWorker.java  ← Daily Supabase query
│               ├── NotificationService.java         ← WorkManager scheduling
│               ├── NotificationHelper.java          ← Notification channels
│               └── BootReceiver.java                ← Boot recovery
│
├── .github/workflows/
│   ├── keepalive.yml        ← Keep Supabase alive (Mon/Thu)
│   └── build-android.yml    ← Build APK with env vars
│
├── ARCHITECTURE.md
├── ARCHITECTURE_DIAGRAM.md
├── SETUP_GUIDE.md
├── IMPLEMENTATION_SUMMARY.md
├── WORKMANAGER_IMPLEMENTATION.md
├── SUPABASE_INTEGRATION.md
└── README.md
```

## Environment Variables Flow

```
Developer's Machine
  │
  ├─ Set: SUPABASE_URL
  ├─ Set: SUPABASE_ANON_KEY
  │
  ▼
./gradlew clean build
  │
  ├─ Read env variables
  │
  ├─ build.gradle:
  │  buildConfigField "String", "SUPABASE_URL", 
  │    "\"${System.getenv('SUPABASE_URL')}\""
  │
  ├─ buildConfigField "String", "SUPABASE_ANON_KEY",
  │    "\"${System.getenv('SUPABASE_ANON_KEY')}\""
  │
  ▼
Compile Java → Generate BuildConfig.java
  │
  ├─ public static final String SUPABASE_URL = "..."
  ├─ public static final String SUPABASE_ANON_KEY = "..."
  │
  ▼
BirthdayNotificationWorker.java runtime
  │
  ├─ Access: BuildConfig.SUPABASE_URL
  ├─ Access: BuildConfig.SUPABASE_ANON_KEY
  │
  ▼
Send HTTP request with credentials
```

## Web Build → Android Assets Flow

```
npm run build
  │
  ├─ Vite compiles React + TypeScript
  ├─ base: './' → relative asset paths
  │
  ▼
dist/
  ├─ index.html         (references ./assets/...)
  ├─ favicon.svg
  └─ assets/
      ├─ index-*.js     (bundled React app)
      └─ index-*.css    (bundled styles)
  │
  ▼
Copy dist/* → android/app/src/main/assets/public/
  │
  ▼
MainActivity.onCreate()
  ├─ setTheme(AppTheme.NoActionBar) ← clears splash
  ├─ WebView settings: JS, DOM storage, file access
  └─ loadUrl("file:///android_asset/public/index.html")
      │
      ▼
  React app mounts in WebView
  └─ Supabase client initializes with localStorage
```

## Notification Lifecycle

```
Day 0: User Opens App
   │
   ├─ MainActivity.onCreate()
   │
   ├─ NotificationService.scheduleNotificationCheck()
   │
   ├─ Create PeriodicWorkRequest
   │  ├─ Class: BirthdayNotificationWorker
   │  ├─ Interval: 24 hours
   │  ├─ Constraints: Battery not low
   │  └─ Tag: "birthday_notification_work"
   │
   ├─ WorkManager.enqueueUniquePeriodicWork()
   │
   ▼
Day 1 (24h later): WorkManager Triggers
   │
   ├─ BirthdayNotificationWorker.doWork()
   │
   ├─ Checks Supabase
   │
   ├─ If birthday found:
   │  └─ Notification sent ✓
   │
   ├─ Return Result.success()
   │
   ▼
Day 2 (24h later): WorkManager Triggers Again
   │
   └─ ... Repeats forever ...

   ─── (Device Restart at Day 3) ───
   │
   ▼
BootReceiver.onReceive()
   │
   ├─ Intent.ACTION_BOOT_COMPLETED received
   │
   ├─ NotificationService.scheduleNotificationCheck()
   │
   ▼
WorkManager Re-registered
   │
   ▼
Day 4 (24h after restart): WorkManager Triggers
   │
   └─ Notifications resume ✓
```

## This Architecture Ensures

- ✅ **Reliability**: System-managed by WorkManager
- ✅ **Efficiency**: Battery-aware, constrained scheduling
- ✅ **Persistence**: Survives app crashes, device reboots, updates
- ✅ **Privacy**: Uses your Supabase anon key (RLS applies)
- ✅ **Transparency**: Full logging for debugging
- ✅ **Simplicity**: No Capacitor or hybrid framework overhead
- ✅ **Scalability**: Handles hundreds of birthdays
- ✅ **Maintainability**: Clean separation of concerns
