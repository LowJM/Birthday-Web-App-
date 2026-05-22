# Technical Architecture: Birthday App

This document outlines the technical design of the Birthday App, focusing on the local-first experience, cloud synchronization, and the complex authentication handling that enables guest usage.

## Tech Stack Overview

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion (Animations) + Lucide (Icons)
- **Backend / Sync**: Supabase (Auth + PostgreSQL)
- **Mobile Runtime**: Android WebView + WorkManager (Background Notifications)

---

## 🔐 Authentication Ecosystem

Implementing a "Guest First" experience that transitions seamlessly to a cloud-synced account was one of the most complex parts of this project.

### 1. Zero-Downtime Guest Access
The app enforces an authenticated state at all times. If no session exists, it immediately signs the user in **Anonymously**.
- **User Experience**: Users can add birthdays immediately without seeing a login screen.
- **Implementation**: `supabase.auth.signInAnonymously()` triggers during initialization and instantly after any sign-out.

### 2. The Multi-Phase "Upgrade" Flow
When a guest decides to "Link" their account, the logic handles several states to prevent data loss:

1. **Attempt Link**: Using `supabase.auth.updateUser({ email, password })`.
2. **Conflict Detection**: If the email is already registered (Status 422 or specific error message), the app doesn't just fail. It enters **Conflict Resolution**.
3. **Data Merging**:
   - If the guest has saved birthdays, the user is prompted to **Merge** or **Discard**.
   - **Merge Logic**: The app signs in to the existing account, maps the temporary guest data to the new user ID, and batch-inserts it into the `birthdays` table before clearing the local state.

### 3. Deep Link Handling
To confirm email updates and account linking on mobile devices, the app handles custom URL schemes (`com.birthdayapp://confirm`) via Android's intent filter system.
- **Parsing**: The Android `MainActivity` can intercept deep link intents, parse the `access_token` and `refresh_token` from the URL fragments, and pass them to the WebView for `supabase.auth.setSession()` to complete the handshake.

---

## 📱 Mobile Architecture (Android WebView)

The app runs as a **React web app inside an Android WebView** — no Capacitor or hybrid framework is used.

### How It Works
1. **Vite builds** the React app into static HTML/JS/CSS (`npm run build`)
2. The **dist output** is copied to `android/app/src/main/assets/public/`
3. `MainActivity` creates a WebView and loads `file:///android_asset/public/index.html`
4. The WebView has JavaScript, DOM storage, and file access enabled
5. The app theme transitions from the splash screen to the WebView on `onCreate()`

### Key Design Decisions
- **Relative asset paths**: `vite.config.ts` sets `base: './'` so built paths resolve correctly under the `file://` protocol
- **No Capacitor bridge**: All native features (notifications, boot recovery) are handled directly in Java via WorkManager
- **localStorage for auth**: Supabase auth tokens are persisted via `localStorage` (accessible in the WebView)

---

## 🔔 Notification System (WorkManager)

Background birthday notifications are handled entirely by Android's **WorkManager** — no Capacitor plugins required.

### Components
- **`NotificationService`**: Schedules a `PeriodicWorkRequest` for daily birthday checks
- **`BirthdayNotificationWorker`**: Queries Supabase REST API directly via HTTP, filters for today's birthdays, and sends native notifications
- **`NotificationHelper`**: Creates notification channels and builds notification UI
- **`BootReceiver`**: Reschedules WorkManager tasks after device reboot

### Key Properties
- Runs every 24 hours, even with the app closed
- Survives device reboots via `BOOT_COMPLETED` broadcast
- Battery-aware scheduling (respects doze mode)
- Daily deduplication via `SharedPreferences` to prevent duplicate notifications

---

## 🧮 Birthday Calculation Engine

The calculation logic is meticulously designed to avoid "Date Timezone Shifting":
- Dates are stored as `YYYY-MM-DD` strings in Supabase.
- Parsing is done manually (`split('-')`) to ensure "January 1st" stays "January 1st" regardless of whether the user is in NYC or Tokyo.
- `useMemo` optimizes the enrichment of birthdays (calculating `daysLeft`, `isToday`) for every render without performance hits.
