# Birthday Scheduler: User Guide

Welcome to the Birthday Scheduler! This simple application helps you keep track of all the special dates in your life and sends you friendly reminders so you never forget to wish someone a happy birthday.

Here is a step-by-step guide to get you up and running.

---

## 1. Launching the App

To open the app, you just need to access the local web server. 

1. Ensure your local server is running (it typically runs on port 3000 if using standard settings).
2. Open your preferred web browser (e.g., Chrome, Edge, Safari, or Firefox).
3. In the address bar at the top, type `http://localhost:3000` and hit **Enter**.
4. The Birthday Scheduler dashboard will load immediately.

## 2. Adding a New Birthday

Adding a friend or family member requires just a few clicks:

1. Look for the **"Add New Birthday"** section on the main screen.
2. Click on the **Person's Name** field and type the name of the person (e.g., "Jane Doe").
3. Click on the **Birthdate** field. Depending on your browser, a calendar picker will pop up. Select their date of birth. (You don't need to worry about the year, just selecting an accurate month and day is fine, though full dates work perfectly).
4. Click the purple **Save Birthday** button.

The birthday will immediately appear in the **"Upcoming Birthdays"** list below! This list automatically sorts everyone so the birthdays happening closest to today appear at the very top.

## 3. Granting Notification Permissions

The best feature of this app is that it can send you reminders! However, for privacy reasons, your web browser requires you to grant the app permission to send these alerts.

1. The very first time you hit **Save Birthday**, your browser will show a prompt near the top of the window (usually near the address bar).
2. The prompt will say something like: *"localhost:3000 wants to show notifications"*.
3. Click **Allow**.

*Note: If you accidentally click "Block", the app won't be able to remind you. You'll need to go into your browser's site settings to manually change the permission to "Allow".*

## 4. What to Expect from Reminders

Once permissions are granted, you don't need to do anything else. The app handles the rest!

- **When it happens:** If you open or refresh the app and it happens to be someone's birthday on that exact day, the reminder will trigger.
- **What it looks like:** You will receive a standard, system-level notification block on your computer screen (usually sliding in from the bottom-right on Windows, or top-right on Mac). 
- **The message:** It will display a small cake icon and a cheerful message: *"Birthday Reminder! 🎉 It's Jane Doe's birthday today! Don't forget to wish them well!"*

The app is smart enough to remember that it already reminded you today, so it won't spam you if you repeatedly refresh or revisit the page.

---

That's it! Enjoy using the Birthday Scheduler.
