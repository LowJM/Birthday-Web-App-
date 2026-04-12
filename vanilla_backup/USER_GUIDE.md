# Tutorial: Managing Birthdays in 5 Minutes

**What you'll build**: A personalized local dashboard of upcoming birthdays that sends native browser notifications on the day of the event.

**What you'll learn**:
- How to launch a local server for the app
- How to add and manage birthdays
- How to enable and receive native browser notifications

**Prerequisites**:
- [ ] A modern web browser (Google Chrome, Firefox, Safari, or Microsoft Edge)
- [ ] A local static file server (like `python -m http.server`) installed on your computer

---

## Step 1: Launch Your App

First, you need to serve the application files via a local HTTP server so that the browser can fully utilize the native Notifications API. 

Open your terminal or command prompt, navigate to the folder containing the app, and run one of the following commands:

```bash
# If you have Python installed:
python -m http.server 3000

# Alternative: If you have Node.js installed:
npx http-server -p 3000
```

Once the server is running, open your web browser and navigate to `http://localhost:3000`. You should see the empty Birthday Scheduler dashboard.

> **Tip**: If you see an error about port `3000` already being in use, try changing the number to `8080` (e.g., `python -m http.server 8080`).

## Step 2: Add a Birthday

Let's input your first birthday to see how the sorting works.

1. Locate the **"Add New Birthday"** section on the main screen.
2. Type a name into the **Person's Name** field (e.g., "Jane Doe").
3. Click the **Birthdate** field to open your browser's calendar picker, and select their exact date of birth. 
4. Click the **Save Birthday** button.

The birthday will immediately appear in the **"Upcoming Birthdays"** list below. As you add more people, this list automatically sorts itself so the birthdays happening closest to today appear at the very top.

## Step 3: Grant Notification Permissions

The best feature of this app is its ability to send you automatic reminders. Once you click "Save Birthday" for the first time, your browser will prompt you for permission.

1. Look near your web browser's address bar for a popup that says something like: *"localhost:3000 wants to show notifications"*.
2. Click **Allow**.

*Note: If you click "Block", the app won't be able to remind you. You'll need to go into your browser's site settings to manually change the permission to "Allow".*

## Step 4: What You Built

Congratulations! You have set up a localized, private birthday tracker. 

Here is what will happen automatically from now on:
- **When it happens**: Whenever you open or keep this app open on someone's exact birthday, a reminder will trigger.
- **What it looks like**: You'll receive a system-level notification block on your screen (usually in the bottom-right on Windows or top-right on Mac).
- **The experience**: It displays a small cake icon and a cheerful message: *"Birthday Reminder! 🎉 It's Jane Doe's birthday today!"*

The app is smart enough to remember that it already reminded you today, so it won't spam you if you repeatedly refresh the page.

## Next Steps

- [Reference: Read the developer documentation](README.md)
