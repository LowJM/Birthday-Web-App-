# WorkManager Birthday Notifications Implementation

## Overview

This document explains the refactored birthday notification system using Android's **WorkManager** API, which provides reliable background task scheduling with automatic device boot recovery. **Capacitor has been removed** — the app now uses pure Java/Kotlin with WorkManager.

## Architecture

### Components Created

#### 1. **NotificationHelper.java** (`android/app/src/main/java/com/lowjm/birthdayapp/NotificationHelper.java`)
- Creates notification channels (required for Android 8.0+)
- Builds consistent birthday notification UI
- Centralizes notification formatting

#### 2. **BirthdayNotificationWorker.java** (`android/app/src/main/java/com/lowjm/birthdayapp/BirthdayNotificationWorker.java`)
- Core background task that runs on the schedule defined by WorkManager
- Checks for birthdays that match today's date
- Sends notifications using `NotificationManager`
- Implements daily deduplication to avoid sending multiple notifications per person per day
- Runs even when app is closed (system managed)
- **Queries Supabase API directly** via HTTP (no Capacitor bridge needed)

#### 3. **NotificationService.java** (`android/app/src/main/java/com/lowjm/birthdayapp/NotificationService.java`)
- Manages WorkManager scheduling
- `scheduleNotificationCheck()` - Schedule daily birthday checks
- `cancelNotificationCheck()` - Stop scheduled checks
- `triggerImmediateCheck()` - Force a check right now (useful for testing)

#### 4. **BootReceiver.java** (`android/app/src/main/java/com/lowjm/birthdayapp/BootReceiver.java`)
- BroadcastReceiver that triggers on device boot
- Reschedules WorkManager tasks after device restart
- Ensures notifications continue after device reboots

#### 5. **Updated MainActivity.java**
- Now extends `AppCompatActivity`
- Switches theme from splash to app on `onCreate()`
- Creates WebView with JavaScript, DOM storage, and file access enabled
- Loads React app from `file:///android_asset/public/index.html`
- Initializes WorkManager scheduling on app launch

### How It Works

```
User opens app
    ↓
MainActivity.onCreate() runs
    ↓
NotificationService.scheduleNotificationCheck() called
    ↓
WorkManager schedules daily task
    ↓
Every 24 hours (or when triggered):
  - BirthdayNotificationWorker runs
  - Makes HTTP GET to Supabase REST API
  - Parses JSON response
  - Checks if today is someone's birthday
  - Sends notification if match found
    ↓
Device restarts
    ↓
BootReceiver triggered
    ↓
NotificationService.scheduleNotificationCheck() re-runs
    ↓
WorkManager tasks resume
```

## Key Features

### 1. **Reliable Background Execution**
- WorkManager survives device reboots
- Survives app uninstalls/reinstalls
- Works with device doze mode and battery optimization

### 2. **Daily Schedule**
- Checks for birthdays every 24 hours
- Uses `PeriodicWorkRequest` with `ExistingPeriodicWorkPolicy.REPLACE` to avoid duplicates

### 3. **Direct Supabase Integration**
- **No Capacitor bridge** — queries Supabase API directly via HTTP
- Uses environment variables injected at build time: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- Efficient: ~1KB per API call

### 4. **Constraints-Based Scheduling**
- Only runs when battery is not critically low
- Respects device battery saver mode

## Integration Changes

### AndroidManifest.xml Changes
```xml
<!-- Boot receiver to restart notifications on device reboot -->
<receiver
    android:name=".BootReceiver"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
    </intent-filter>
</receiver>
```

### build.gradle Changes
```gradle
// Removed: Capacitor dependencies
// Added: WorkManager + Supabase HTTP support
implementation "androidx.work:work-runtime:2.8.1"
implementation "androidx.core:core:1.13.1"

// Environment variables injected at build time
buildConfigField "String", "SUPABASE_URL", "\"${System.getenv('SUPABASE_URL') ?: ''}\""
buildConfigField "String", "SUPABASE_ANON_KEY", "\"${System.getenv('SUPABASE_ANON_KEY') ?: ''}\""
```

### Frontend Changes (supabase.ts)
```typescript
// Old (Capacitor Preferences):
// const { value } = await Preferences.get({ key });

// New (localStorage):
localStorage.getItem(key);
```

## Supabase API Integration

The `BirthdayNotificationWorker` queries Supabase using HTTP GET:

```
GET {SUPABASE_URL}/rest/v1/birthdays?select=name,birth_date
Authorization: Bearer {SUPABASE_ANON_KEY}
```

Example response:
```json
[
  { "name": "John Doe", "birth_date": "1990-05-22" },
  { "name": "Jane Smith", "birth_date": "1988-05-22" }
]
```

The worker then:
1. Gets today's date
2. Filters for birthdays where `month == today.month AND day == today.day`
3. Sends notification for each match

## Testing the Implementation

### Manual Testing
1. **Schedule check immediately**: 
   - Set a birthday for today
   - Open app (triggering WorkManager scheduling)
   - Wait for WorkManager to run or check logs

2. **Verify WorkManager task**:
   ```bash
   adb shell dumpsys jobscheduler | grep birthday
   ```
   Look for the scheduled work

3. **Test device reboot**:
   - Restart device
   - Verify notifications resume

### Automated Testing
Create a test task in React to trigger the immediate check and verify it works.

## Platform Support

- ✅ **Android 7.0+** (API 24+) - Full WorkManager support
- ✅ **Android 8.0+** - Notification channels required (implemented)
- ✅ **Android 12+** - Notification runtime permissions required (permission in manifest)

## iOS Support

This implementation is **Android-only**. For iOS, you would need a different approach since iOS doesn't support indefinite background tasks. Consider Firebase Cloud Messaging (FCM) for cross-platform support.

## Advantages Over Capacitor LocalNotifications

| Feature | WorkManager | LocalNotifications (Capacitor) |
|---------|-------------|--------------------------------|
| Survives device reboot | ✅ | ❌ |
| Works with app closed | ✅ | ⚠️ Limited |
| Battery efficient | ✅ | ⚠️ |
| Respects doze mode | ✅ | ⚠️ |
| Daily recurring checks | ✅ | ⚠️ |
| No framework overhead | ✅ | ❌ (Capacitor adds complexity) |
| Direct Supabase integration | ✅ | ❌ (requires bridge) |

## Removal of Capacitor

Capacitor was removed because:
1. **Java version conflict**: Capacitor 8.3.0 required Java 21; system had Java 26 (incompatible)
2. **Feature overlap**: WorkManager provides all notification functionality we need
3. **Reduced complexity**: Fewer dependencies, faster build times
4. **Better performance**: No bridge overhead for background tasks

Files removed:
- `BirthdayNotificationPlugin.java` (Capacitor bridge - no longer needed)
- Capacitor dependencies from `build.gradle` and `settings.gradle`
- Capacitor Preferences import from `supabase.ts`

## Build Configuration

The app now builds with pure Java + React:
```
Android
├── Pure Java: WorkManager, NotificationManager, BootReceiver
├── Web assets: React compiled to static HTML/JS/CSS
└── Native code compiled together into APK
```

No Capacitor layer means:
- ✅ Faster builds
- ✅ Smaller APK size
- ✅ Fewer dependencies to update
- ✅ Better control over native functionality

## Troubleshooting

### Notifications not sending
1. Check `BirthdayNotificationWorker` logs: `adb logcat | grep BirthdayWorker`
2. Verify Supabase credentials in environment variables
3. Verify birthday date format (YYYY-MM-DD)
4. Check notification permissions are granted

### WorkManager not scheduling
1. Verify `BootReceiver` is in manifest
2. Check `android:exported="true"` on receivers
3. Ensure WorkManager dependencies are in build.gradle
4. Verify `MainActivity` calls `NotificationService.scheduleNotificationCheck()`

### Device reboot breaks notifications
1. Verify `BootReceiver` receiver in manifest
2. Check `RECEIVE_BOOT_COMPLETED` permission
3. Test with: `adb shell am broadcast -a android.intent.action.BOOT_COMPLETED -p com.lowjm.birthdayapp`

### "API response code: 401"
1. Check Supabase anon key is correct (from Dashboard → Settings → API)
2. Verify it's the "anon public" key, not service role
3. Rebuild: `./gradlew clean build`
