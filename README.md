# Birthday Scheduler

> A modern, local-first mobile application to track upcoming birthdays with cloud sync and native notifications.

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Capacitor](https://img.shields.io/badge/capacitor-%23119EFF.svg?style=for-the-badge&logo=capacitor&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

## Why This Exists

Missing a birthday is a pain, but privacy is paramount. This app offers the best of both worlds: a **Guest-First** experience that works immediately without an account, and **Cloud Sync** for users who want to access their data across devices securely via Supabase.

## ✨ Features

- **Guest Access**: Immediate offline-ready usage using Supabase Anonymous Auth.
- **Account Linking**: Seamlessly upgrade a guest account to an email-verified account with **Data Merge** logic.
- **Native Notifications**: System-level reminders on Android (and web) for upcoming birthdays.
- **Dynamic Calendar**: Interactive month view with birthday indicators.
- **Responsive Design**: Premium dark-mode UI built with Tailwind and Framer Motion.

## 🚀 Quick Start

### Hardware/Software Requirements
- **Node.js**: 20+
- **Supabase Account**: (See [SUPABASE.md](SUPABASE.md))
- **Android Studio**: (For mobile development)

### Installation

```bash
# 1. Clone & Install
npm install

# 2. Setup Environment
cp .env.example .env # Add your Supabase keys
```

### Development

```bash
# Web Dev Server
npm run dev

# Mobile (Android)
npx cap sync
npx cap open android
```

## 📐 Architecture & Security

For a deep dive into the "Headache" that was authentication integration, Conflict Resolution, and Deep Link handling, please see:

👉 [**ARCHITECTURE.md**](ARCHITECTURE.md)

## 📖 User Guide

New to the app? Learn how to manage birthdays and link your account:

👉 [**USER_GUIDE.md**](USER_GUIDE.md)

## License

MIT © 2026
