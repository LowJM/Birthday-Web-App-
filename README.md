# Birthday Scheduler

> A modern, local-first mobile application to track upcoming birthdays with cloud sync and native notifications.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Android WorkManager](https://img.shields.io/badge/WorkManager-3DDC84?style=for-the-badge&logo=android&logoColor=white)
![Android](https://img.shields.io/badge/android-%3DDC84.svg?style=for-the-badge&logo=android&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)

## Why This Exists

Missing a birthday is a pain, but privacy is paramount. This app offers the best of both worlds: a **Guest-First** experience that works immediately without an account, and **Cloud Sync** for users who want to access their data across devices securely via Supabase.

## ✨ Features

- **Guest Access**: Immediate offline-ready usage using Supabase Anonymous Auth.
- **Account Linking**: Seamlessly upgrade a guest account to an email-verified account with **Data Merge** logic.
- **Native Notifications**: System-level reminders on Android with WorkManager for reliable background task scheduling.
- **Daily Background Checks**: Automatic birthday checks every 24 hours, even when the app is closed (Android).
- **Device Boot Recovery**: Notifications resume automatically after device restart.
- **Dynamic Calendar**: Interactive month view with birthday indicators.
- **Responsive Design**: Premium dark-mode UI built with Tailwind and Framer Motion.

## 🚀 Quick Start

### Hardware/Software Requirements
- **Node.js**: 20+
- **Supabase Account**: (See [SUPABASE.md](SUPABASE.md))
- **Android Studio**: (For mobile development)
- **Java**: 11+ (no Java 21 requirement)
- **Environment Variables**: `SUPABASE_URL` and `SUPABASE_ANON_KEY` (See [SUPABASE_INTEGRATION.md](SUPABASE_INTEGRATION.md))

### Installation

```bash
# 1. Clone & Install
npm install

# 2. Set environment variables for Android builds (see SUPABASE_INTEGRATION.md)
# Windows: setx SUPABASE_URL "..."
# macOS/Linux: export SUPABASE_URL="..."
```

### Development

```bash
# Web Dev Server (browser testing)
npm run dev

# Mobile (Android) - Full build pipeline
npm run build                                          # Build React app
cp -r dist/* android/app/src/main/assets/public/       # Copy to Android assets
cd android
./gradlew assembleDebug                                # Build APK

# Install on connected device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

> **Important**: The React app runs inside an Android WebView. You must rebuild web assets and copy them to `android/app/src/main/assets/public/` whenever you make frontend changes.

## 📐 Architecture & Security

For a deep dive into the "Headache" that was authentication integration, Conflict Resolution, and Deep Link handling, please see:

👉 [**ARCHITECTURE.md**](ARCHITECTURE.md)

## 🔔 Background Notifications (Android)

The app uses **WorkManager** (no Capacitor, no hybrid frameworks) to automatically check for birthdays every 24 hours, even when the app is closed. The React frontend runs inside an Android **WebView**.

### Setup Required

1. **Set environment variables** with your Supabase credentials
2. **Rebuild Android app** for changes to take effect
3. See [**SUPABASE_INTEGRATION.md**](SUPABASE_INTEGRATION.md) for detailed instructions

### How It Works

- **WorkManager** schedules daily background checks
- Each check queries Supabase for birthdays matching today
- Notifications are sent automatically
- Device reboots are handled by **BootReceiver**

For technical details, see:
- [**WORKMANAGER_IMPLEMENTATION.md**](WORKMANAGER_IMPLEMENTATION.md) - Architecture and implementation details
- [**SUPABASE_INTEGRATION.md**](SUPABASE_INTEGRATION.md) - Database integration and setup

## 📖 User Guide

New to the app? Learn how to manage birthdays and link your account:

👉 [**USER_GUIDE.md**](USER_GUIDE.md)

## 🔄 CI/CD

### GitHub Actions

**Keep Supabase Project Active**
- Workflow: `.github/workflows/keepalive.yml`
- Runs: Every Monday and Thursday
- Purpose: Prevents Supabase project from pausing due to inactivity

**Build Android APK** (Manual Trigger)
- Workflow: `.github/workflows/build-android.yml`
- Requires: `SUPABASE_URL` and `SUPABASE_ANON_KEY` secrets
- Output: APK artifact available for download

## License

MIT © 2026
