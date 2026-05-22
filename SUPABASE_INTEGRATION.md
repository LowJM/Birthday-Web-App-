# Supabase Integration for Birthday Notifications

## Overview

The `BirthdayNotificationWorker` now queries your Supabase database directly to find birthdays matching today's date and automatically sends notifications.

## How It Works

1. **WorkManager triggers daily** - Every 24 hours, the background task runs
2. **Queries Supabase API** - Fetches all birthdays from your `birthdays` table
3. **Filters for today** - Checks if anyone's birthday matches today (month + day only)
4. **Sends notifications** - For each match, displays a native Android notification

## Setup Instructions

### Step 1: Configure Build Gradle

The `build.gradle` file now reads Supabase credentials from **environment variables**:

```gradle
buildConfigField "String", "SUPABASE_URL", "\"${System.getenv('SUPABASE_URL') ?: ''}\""
buildConfigField "String", "SUPABASE_ANON_KEY", "\"${System.getenv('SUPABASE_ANON_KEY') ?: ''}\""
```

### Step 2: Set Environment Variables

You need to set these environment variables on your machine:

#### On Windows (PowerShell):
```powershell
# Set environment variables
[Environment]::SetEnvironmentVariable("SUPABASE_URL", "https://your-project.supabase.co", "User")
[Environment]::SetEnvironmentVariable("SUPABASE_ANON_KEY", "your-anon-key-here", "User")

# Verify they're set
$env:SUPABASE_URL
$env:SUPABASE_ANON_KEY

# Restart your IDE/terminal for changes to take effect
```

#### On Windows (Command Prompt):
```cmd
setx SUPABASE_URL "https://your-project.supabase.co"
setx SUPABASE_ANON_KEY "your-anon-key-here"
```

#### On macOS/Linux:
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"

# Make permanent by adding to ~/.bashrc, ~/.zshrc, or ~/.profile
echo 'export SUPABASE_URL="https://your-project.supabase.co"' >> ~/.zshrc
echo 'export SUPABASE_ANON_KEY="your-anon-key-here"' >> ~/.zshrc
```

### Step 3: Find Your Supabase Credentials

1. Go to your [Supabase project dashboard](https://app.supabase.com)
2. Click **Settings** (gear icon)
3. Select **API** from the sidebar
4. Copy:
   - **Project URL** → Your `SUPABASE_URL`
   - **anon public** → Your `SUPABASE_ANON_KEY`

### Step 4: Rebuild the Android App

After setting environment variables, rebuild:

```bash
# From project root
cd android
./gradlew clean build

# Or rebuild in Android Studio
```

## How It Integrates with Your Existing Setup

### Existing Components (Still Active)
- ✅ GitHub Actions `keepalive.yml` - Pings Supabase twice weekly
- ✅ React App - Manages UI and birthday additions (runs in Android WebView)
- ✅ Web App - Also works in browser via `npm run dev`

### New Components
- ✅ WorkManager - Daily background checks (always on)
- ✅ BirthdayNotificationWorker - Queries Supabase and sends notifications
- ✅ BootReceiver - Reschedules after device restart

### Together They Provide:

| When | What Happens | How |
|------|--------------|-----|
| User adds a birthday in app | Stored in Supabase | React/Supabase |
| GitHub Actions runs (Mon/Thu) | Database stays active | GitHub Actions keepalive.yml |
| Every 24 hours | Birthday check runs | WorkManager (Android-only) |
| Birthday matches today | Notification shows | Native Android notification |
| Device restarts | Checks resume | BootReceiver |

## Database Query Details

### What Gets Queried

The Worker fetches from the `birthdays` table:

```sql
SELECT id, name, birth_date FROM birthdays
```

### How It Filters

For a birthday to trigger a notification, it must match:
- `birth_date` MONTH matches TODAY's MONTH
- `birth_date` DAY matches TODAY's DAY

Example:
- Birth date: `1995-03-15`
- Today: `2026-03-15`
- Result: ✅ Match! Send notification

The year doesn't matter (so people get notified every year).

### Daily Deduplication

The Worker uses `SharedPreferences` to track the last check date:
- Checks if today's date has already been processed
- Prevents duplicate notifications if WorkManager runs multiple times

## Testing

### Manual Testing

1. **Add a birthday for today** in the app

2. **Verify WorkManager is scheduled**:
   ```bash
   adb shell dumpsys jobscheduler | grep birthday
   ```

3. **Check logs** for errors:
   ```bash
   adb logcat -s BirthdayApp:D BirthdayWorker:D
   ```

### Automated Testing

Add a test birthday:
1. Add someone with today's date in the app
2. Trigger immediate check
3. Verify notification appears

## Troubleshooting

### Notifications Not Showing

1. **Check environment variables are set**:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   ```

2. **Rebuild after setting variables**:
   ```bash
   cd android && ./gradlew clean build
   ```

3. **Check logs**:
   ```bash
   adb logcat | grep "BirthdayWorker"
   ```

### API Returns 401/403

- Invalid or expired `SUPABASE_ANON_KEY`
- Check [Supabase Dashboard](https://app.supabase.com) for correct key

### No Birthdays Found

- Check date format in database (should be `YYYY-MM-DD`)
- Verify `birth_date` isn't null
- Run the GitHub Actions keepalive job to ensure database is active

## Security Considerations

### Using ANON_KEY

The app uses the **anon public key** (not service role key) because:
- ✅ Safe for public apps
- ✅ Row-level security (RLS) policies apply
- ✅ Limited to read-only queries in production
- ✅ Can't modify data

### Protecting Credentials

- ✅ Never commit secrets to git (use `.env` or environment variables)
- ✅ Credentials are embedded at **build time**, not runtime
- ✅ Consider using Android Keystore for extra security if needed

## Future Enhancements

1. **Cache birthdays locally** - Reduce API calls
2. **Sync with contacts** - Import from phone contacts
3. **Multiple timezones** - Handle users in different timezones
4. **Push notifications** - Use FCM for better delivery
5. **Batch query** - Query only necessary birthdays

## API Reference

### Supabase REST Endpoint Used

```
GET {SUPABASE_URL}/rest/v1/birthdays?select=id,name,birth_date
Authorization: Bearer {SUPABASE_ANON_KEY}
```

### Response Format

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "birth_date": "1990-03-15"
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "name": "Jane Smith",
    "birth_date": "1992-03-15"
  }
]
```

## Logs to Watch For

After rebuilding and running:

```
D/BirthdayWorker: Supabase API response code: 200
D/BirthdayWorker: Sent notification for John Doe
D/BirthdayWorker: Already checked birthdays today
```

Errors:

```
E/BirthdayWorker: Error querying Supabase
W/BirthdayWorker: Supabase credentials not configured
E/BirthdayWorker: Error parsing birth date
```
