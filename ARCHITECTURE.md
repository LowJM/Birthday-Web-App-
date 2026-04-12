# Technical Architecture: Birthday App

This document outlines the technical design of the Birthday App, focusing on the local-first experience, cloud synchronization, and the complex authentication handling that enables guest usage.

## Tech Stack Overview

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion (Animations) + Lucide (Icons)
- **Backend / Sync**: Supabase (Auth + PostgreSQL)
- **Mobile Foundation**: Capacitor (Android + Native APIs)

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

### 3. Native Deep Link Handling
To confirm email updates and account linking on mobile devices, the app utilizes Capacitor's `App` plugin to handle custom URL schemes (`com.birthdayapp://confirm`).
- **Parsing**: The app listens for `appUrlOpen` events, parses the `access_token` and `refresh_token` from the URL fragments, and calls `supabase.auth.setSession()` to complete the handshake.

---

## 📅 Notification Synchronization

To maintain high efficiency, notification scheduling is hashed and throttled.

- **Deduplication**: A `lastScheduledHash` (using `useRef`) stores a JSON hash of all birthdays and their next dates. Scheduling only triggers if the hash deviates.
- **Mobile Constraints**: Since mobile OSs limit the number of future notifications, the app schedules the nearest **50** upcoming birthdays.
- **Native Bridge**: Uses `@capacitor/local-notifications` to interface with system-level alarms.

## 🧮 Birthday Calculation Engine

The calculation logic is meticulously designed to avoid "Date Timezone Shifting":
- Dates are stored as `YYYY-MM-DD` strings in Supabase.
- Parsing is done manually (`split('-')`) to ensure "January 1st" stays "January 1st" regardless of whether the user is in NYC or Tokyo.
- `useMemo` optimizes the enrichment of birthdays (calculating `daysLeft`, `isToday`) for every render without performance hits.
