# Quick Reference Guide

## 🚀 30-Second Setup

```bash
# 1. Set environment variables
# Windows (PowerShell):
[Environment]::SetEnvironmentVariable("SUPABASE_URL", "https://YOUR-PROJECT.supabase.co", "User")
[Environment]::SetEnvironmentVariable("SUPABASE_ANON_KEY", "YOUR-ANON-KEY", "User")

# macOS/Linux:
export SUPABASE_URL="https://YOUR-PROJECT.supabase.co"
export SUPABASE_ANON_KEY="YOUR-ANON-KEY"

# 2. Install & build
npm install
cd android && ./gradlew clean build

# 3. Install on device
./gradlew installDebug
```

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `BirthdayNotificationWorker.java` | Daily background check task |
| `NotificationService.java` | Manages WorkManager scheduling |
| `BootReceiver.java` | Handles device reboot |
| `build.gradle` | Injects Supabase credentials |
| `supabase.ts` | Uses localStorage (no Capacitor) |
| `.github/workflows/build-android.yml` | CI/CD for building APK |
| `SETUP_GUIDE.md` | Detailed setup instructions |
| `SUPABASE_INTEGRATION.md` | Database integration details |

## 🔍 Testing Commands

```bash
# Verify WorkManager scheduled
adb shell dumpsys jobscheduler | grep birthday

# View logs
adb logcat | grep "BirthdayWorker"

# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew bundleRelease
```

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Credentials not configured" | Set env vars, restart IDE, rebuild |
| Notifications don't appear | Check logs, verify date format YYYY-MM-DD |
| App crashes on startup | Rebuild with `./gradlew clean build` |
| WorkManager not triggering | Verify `BootReceiver` in manifest + env vars |
| API returns 401 | Check Supabase anon key is correct |
| Build fails - Java version | Java 11+ required (no Capacitor Java 21 issue) |

## 📊 What Happens Daily

```
12:00 AM (Midnight - adjustable)
  ↓
WorkManager triggers
  ↓
Query Supabase API for all birthdays
  ↓
Filter for today (month == today.month AND day == today.day)
  ↓
Send notification for each match
  ↓
Done until tomorrow
```

## 🔐 Security Checklist

- [ ] Using **anon public key** (not service role)
- [ ] Credentials in **environment variables** (not hardcoded)
- [ ] Never committed secrets to git
- [ ] Row-level security (RLS) enabled on Supabase
- [ ] Using HTTPS for all API calls
- [ ] Credentials injected at **build time** (not runtime)

## 📞 Support

**Problem?** Check these docs in order:

1. **SETUP_GUIDE.md** - Quick start
2. **SUPABASE_INTEGRATION.md** - Database integration
3. **WORKMANAGER_IMPLEMENTATION.md** - Technical details
4. **ARCHITECTURE_DIAGRAM.md** - How it works

## ✅ Verification Checklist

- [ ] Environment variables set
- [ ] `npm install` succeeded
- [ ] `./gradlew clean build` succeeded
- [ ] App opens without crashes
- [ ] Web app works: `npm run dev` at http://localhost:3000
- [ ] Add birthday for today
- [ ] Logs show: "Sent notification for [name]"
- [ ] Notification appears on screen
- [ ] Restart device, notifications still work

## 🚢 Deployment

### Development
```bash
npm install
cd android && ./gradlew clean build
./gradlew installDebug  # Install on connected device
```

### Debug APK
```bash
cd android
./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK
```bash
cd android
./gradlew bundleRelease
# Bundle at: android/app/build/outputs/bundle/release/app-release.aab
```

### CI/CD (GitHub Actions)
1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to GitHub Secrets
2. Push to main or trigger manually
3. APK available in Actions artifacts

## 📈 Performance Stats

| Metric | Value |
|--------|-------|
| Daily API calls | 1 per day |
| Data per call | ~1KB |
| Battery impact | Minimal |
| Notification latency | Real-time |
| Device boot recovery | Automatic |
| Failure retry | Yes (WorkManager handles) |

## 🎯 What Works

✅ Birthdays stored in Supabase  
✅ Daily automatic checks  
✅ Notifications even with app closed  
✅ Device reboot recovery  
✅ Multiple birthdays same day  
✅ Deduplication to prevent duplicates  
✅ Web app with React + Tailwind  

## 🚫 Limitations

❌ Android-only (iOS would need different implementation)  
❌ Requires setting environment variables  
❌ No push notifications (local only)  
❌ No timezone support (uses device timezone)  
❌ Cannot access local contacts automatically  

## 📚 Documentation Map

```
START HERE
   ↓
SETUP_GUIDE.md (10 min read)
   ↓
Followed by (choose what you need):
   ├─ SUPABASE_INTEGRATION.md (database details)
   ├─ WORKMANAGER_IMPLEMENTATION.md (architecture)
   ├─ ARCHITECTURE_DIAGRAM.md (visual diagrams)
   └─ IMPLEMENTATION_SUMMARY.md (complete overview)
```

## 💡 Pro Tips

1. **Local testing**: Add birthday for today to test without waiting 24h
2. **Debug logs**: Grep for "BirthdayWorker" to see detailed logs
3. **Check Supabase status**: Verify database is active
4. **Verify API**: Test REST endpoint in browser with auth headers
5. **Monitor battery**: WorkManager respects battery optimization settings

## 🔗 Quick Links

- **Supabase Dashboard**: https://app.supabase.com
- **GitHub Actions**: https://github.com/YOUR-REPO/actions
- **Android WorkManager Docs**: https://developer.android.com/topic/libraries/architecture/workmanager
- **React Docs**: https://react.dev

## 📝 Environment Variables Template

```bash
# Get these from Supabase Dashboard → Settings → API
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY-HERE

# GitHub Actions Secrets (same values)
# Settings → Secrets and variables → Actions
```

## 🎓 Learning Path

1. **Read**: SETUP_GUIDE.md
2. **Do**: Set env vars and rebuild
3. **Test**: Add birthday for today
4. **Verify**: Check logs and notification
5. **Understand**: Read WORKMANAGER_IMPLEMENTATION.md
6. **Explore**: Read ARCHITECTURE_DIAGRAM.md

## ⏰ Timing

- **Setup time**: 10 minutes
- **First build**: 5-10 minutes
- **Daily check**: < 100ms
- **Notification display**: Instant

## 📞 When Something Goes Wrong

1. **Read the error message carefully**
2. **Check relevant documentation**
3. **Verify environment variables**: `echo $SUPABASE_URL`
4. **Rebuild**: `./gradlew clean build`
5. **Check logs**: `adb logcat | grep BirthdayWorker`
6. **Verify Supabase is up**: Check dashboard

## 🎉 Success Indicators

✓ Logs show "Supabase API response code: 200"  
✓ Logs show "Sent notification for [name]"  
✓ Native notification appears on screen  
✓ After reboot, checks resume  
✓ Multiple birthdays handled correctly  

---

**Need help?** Start with SETUP_GUIDE.md and follow the checklist!
