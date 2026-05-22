# What is build-android.yml? Complete Explanation

## Overview

**build-android.yml** is a **GitHub Actions workflow** - an automated script that runs on GitHub's servers (not your computer) to build your Android app whenever you push code or manually trigger it.

Think of it like a robot assistant that lives on GitHub and automatically builds your app for you.

---

## File Location

```
.github/workflows/build-android.yml
```

This file is version-controlled in your Git repository, so every developer on your team can use the same build process.

---

## What It Does (Step-by-Step)

### 1. **Checkout Code**
```yaml
- uses: actions/checkout@v3
```
Downloads your repository code to GitHub's servers.

### 2. **Set Up Java**
```yaml
- uses: actions/setup-java@v3
  with:
    java-version: '11'
    distribution: 'temurin'
```
Installs **Java 11** on GitHub's server. (Any Java version 11+ works; no Java 21 requirement.)

### 3. **Set Up Node.js**
```yaml
- uses: actions/setup-node@v3
  with:
    node-version: '18'
```
Installs **Node.js 18** (for npm commands).

### 4. **Install Dependencies**
```yaml
- run: npm install
```
Runs `npm install` to download all your project dependencies.

### 5. **Build Web App**
```yaml
- run: npm run build
```
Compiles your React app into static files.

### 6. **Copy Web Build to Android Assets**
```yaml
- run: cp -r dist/* android/app/src/main/assets/public/
```
Takes the compiled web app and puts it inside the Android app structure (required for web-to-Android bundling).

### 7. **Build Android APK** (The Main Part)
```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
run: |
  cd android
  chmod +x gradlew
  ./gradlew assembleDebug
```
- Sets environment variables with your Supabase credentials
- Navigates to the android folder
- Makes gradlew executable
- **Builds the Android APK** using gradle

### 8. **Upload APK as Artifact**
```yaml
- uses: actions/upload-artifact@v3
  with:
    name: app-debug.apk
    path: android/app/build/outputs/apk/debug/app-debug.apk
    retention-days: 7
```
Saves the built APK file so you can download it from GitHub Actions for 7 days.

---

## Why Use This?

### Without build-android.yml (Manual Process)
```
You write code
    ↓
You commit and push to GitHub
    ↓
You manually build on your computer:
  - Install Java 17
  - Run: npm install
  - Run: npm run build
  - Run: cd android && ./gradlew clean build
    ↓
You get an APK on your computer
    ↓
You manually upload to testers or Play Store
```

**Time:** 20-30 minutes
**Mistakes:** Easy to forget steps
**Consistency:** May build differently on different computers

### With build-android.yml (Automated)
```
You write code
    ↓
You commit and push to GitHub
    ↓
GitHub automatically:
  - Installs Java
  - Installs Node.js
  - Builds web app
  - Builds Android APK
  - Saves APK for download
    ↓
APK is ready immediately
    ↓
Anyone can download from GitHub Actions
```

**Time:** 5 minutes (automatic!)
**Mistakes:** None (always same process)
**Consistency:** Always builds the same way

---

## How to Use It

### Automatic Trigger (On Every Push)
```yaml
on:
  push:
    branches:
      - main
      - develop
```
Every time you push to `main` or `develop` branch, the workflow runs automatically.

### Manual Trigger
```yaml
workflow_dispatch:
```
You can manually trigger it from GitHub UI:

1. Go to: https://github.com/YOUR-USERNAME/Birthday-App/actions
2. Click: `Build Android APK`
3. Click: `Run workflow`
4. It builds automatically!

---

## Secret Variables (IMPORTANT!)

```yaml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

These are **GitHub Secrets** - private values stored securely on GitHub that are only injected at build time.

### How to Set Them Up

1. Go to: `Settings → Secrets and variables → Actions`
2. Click: `New repository secret`
3. Add:
   - Name: `SUPABASE_URL`
   - Value: `https://your-project.supabase.co`
4. Click: `New repository secret`
5. Add:
   - Name: `SUPABASE_ANON_KEY`
   - Value: `your-anon-key`

**Important:** These secrets are:
- ✅ Never shown in logs
- ✅ Never visible in the repository
- ✅ Only available during build
- ✅ Automatically injected as environment variables

---

## Output: Where's My APK?

After the workflow runs:

1. Go to: https://github.com/YOUR-USERNAME/Birthday-App/actions
2. Click the latest workflow run
3. Scroll down to: "Artifacts"
4. Download: `app-debug.apk`

You now have an APK you can:
- Install on your Android phone
- Share with testers
- Upload to Play Store
- Distribute to team members

---

## Workflow File Breakdown

```yaml
name: Build Android APK
```
The name that appears on GitHub Actions dashboard.

```yaml
on:
  workflow_dispatch:  # Can trigger manually
  push:
    branches:
      - main
      - develop
```
**When** the workflow runs:
- `workflow_dispatch` = Manual trigger button
- `push` = Automatic when you push code
- `branches` = Only on these branches

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
```
**Where** to run:
- `ubuntu-latest` = GitHub's Linux server (fastest for Java builds)

```yaml
steps:
  - name: Checkout code
    uses: actions/checkout@v3
```
Each `step` is one action. This one downloads your code.

---

## Real-World Scenario

### Your Workflow
1. You finish adding birthday feature
2. You run: `git push origin main`
3. GitHub automatically:
   - Checks out your code
   - Installs dependencies
   - Builds the web app
   - Builds the Android APK
   - Saves APK for download
4. You get a notification: "✅ Build successful!"
5. You download the APK from GitHub Actions
6. You send to testers or upload to Play Store
7. Done! No manual build steps needed.

---

## Connection to Your App

This workflow specifically:

1. **Uses your SUPABASE_URL and SUPABASE_ANON_KEY**
   - These are injected as environment variables
   - They're compiled into the APK via `build.gradle` `buildConfigField`
   - The `BirthdayNotificationWorker` uses them to query Supabase

2. **Builds the React frontend**
   - Your TypeScript/React code
   - Tailwind CSS
   - All components

3. **Packages into Android app**
   - React code → Android assets
   - Java code → Android compiled code
   - Final → .apk file

---

## Comparison: Your Two Workflows

### keepalive.yml (Existing)
- **Purpose:** Keeps Supabase project from pausing
- **Trigger:** Every Monday & Thursday at midnight
- **Action:** Makes a simple API request to Supabase
- **Status:** Already working, no setup needed

### build-android.yml (New)
- **Purpose:** Builds APK automatically
- **Trigger:** Every push to main/develop + manual trigger
- **Action:** Builds complete Android app
- **Status:** Ready to use (just add GitHub Secrets)

---

## Complete Setup Guide

### 1. Add GitHub Secrets
```
Go to Settings → Secrets → Actions → New Repository Secret

Name: SUPABASE_URL
Value: https://your-project.supabase.co

Name: SUPABASE_ANON_KEY
Value: your-anon-key-here
```

### 2. Push Code
```bash
git add .
git commit -m "Add WorkManager birthday notifications"
git push origin main
```

### 3. Watch It Build
```
Go to Actions tab → Watch the workflow run
```

### 4. Download APK
```
Workflow completes → Click Artifacts → Download APK
```

---

## Benefits

| Benefit | Explanation |
|---------|-------------|
| **Automatic** | No manual builds needed |
| **Consistent** | Always same build process |
| **Fast** | Runs in parallel on GitHub servers |
| **Secure** | Secrets never exposed |
| **Shareable** | Anyone can download APK |
| **Logged** | Full build history saved |
| **Accessible** | Works from anywhere, anytime |

---

## Advanced: What Happens Behind the Scenes

```
GitHub Server (Linux VM)
├── Checkout: Clone your repo
├── Install Java 11: Downloaded and installed
├── Install Node 18: Downloaded and installed
├── npm install: 5-10 minutes
├── npm run build: 2-5 minutes (React build)
├── Copy to Android: 1 minute
├── gradlew clean build: 10-15 minutes (biggest step)
│   ├── Downloads gradle
│   ├── Downloads Android SDK
│   ├── Compiles Java code (BirthdayNotificationWorker etc)
│   ├── Compiles React code
│   └── Creates APK
├── Upload artifact: Save to GitHub
└── Total time: ~20-30 minutes
```

---

## Next Steps

1. **Add GitHub Secrets** (Settings → Secrets)
2. **Push to GitHub** to trigger workflow
3. **Watch Actions tab** for build progress
4. **Download APK** when complete

The workflow is **already configured** and ready to use!

---

## Summary

**build-android.yml** is a **CI/CD automation script** that:
- ✅ Automatically builds your Android app
- ✅ Injects your Supabase credentials securely
- ✅ Saves the APK for download
- ✅ Runs whenever you push code
- ✅ Can be manually triggered anytime

It's a modern dev practice that saves time and ensures consistency!
