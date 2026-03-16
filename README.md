# Birthday Scheduler

> A lightweight, client-side web application to track upcoming birthdays and receive native browser notifications.

## Why This Exists

Missing a friend or family member's birthday is a terrible feeling. This application provides a simple, fast, and privacy-focused way to keep track of birthdays without requiring user accounts or sending data to external servers. Everything lives directly in your browser.

## Quick Start

The easiest way to run the Birthday Scheduler is by serving it locally using a standard HTTP server.

```bash
# Clone the repository and navigate to the directory
cd "Birthday App"

# Start a local static server (e.g., using Python 3)
python -m http.server 3000
```

Then visit `http://localhost:3000` in your web browser.

## Technical Architecture

This project is designed specifically to be as dependency-free as possible, ensuring long-term maintainability and instant load times.

### Core Technologies

- **HTML5 & CSS3**: Vanilla HTML structuring and modern CSS (Flexbox, CSS variables, transitions) without frameworks or preprocessors.
- **Vanilla JavaScript (ES6+)**: Handles all presentation logic and state management without the overhead of React, Vue, or Angular. Let the DOM be your state model.

### Data Persistence

Data is stored entirely on the client side using the browser's native **LocalStorage API**.

- `birthdays`: An array of objects storing the `id`, `name`, and `date` for each entry. 
- `notificationsNotifiedToday`: A mapping object that prevents duplicate notifications from firing repeatedly on the same day for the same birthday.

No backend database or authentication is required. Data remains persistent as long as the user doesn't clear their browser's local storage data for the domain.

### Alerts and Notifications

Alerts are powered by the **Web Notifications API**, which prompts native, system-level notifications on the user's device (desktop or mobile).

1. **Permission Request**: When a user adds their first birthday, the app proactively calls `Notification.requestPermission()` to securely request permission.
2. **Evaluation Logic**: Every time the app loads (or the user interacts with the UI and triggers a re-render), the `calculateNextBirthday` function evaluates if any birthday matches the current date.
3. **Dispatch**: If a birthday falls on today's date, the app uses `new Notification()` to trigger a native pop-up containing a custom icon and message. The record is then logged in `notificationsNotifiedToday` to avoid endless spam on subsequent reloads.

## Usage

### Basic Example

Once running, adding a new entry is as simple as populating the HTML form:

```javascript
// Adding a birthday programmatically (mock example)
const newBirthday = {
    id: Date.now().toString(),
    name: "Jane Doe",
    date: "1990-05-14"
};

const birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
birthdays.push(newBirthday);
localStorage.setItem('birthdays', JSON.stringify(birthdays));
```

## Contributing

Because this project relies entirely on client-side vanilla web technologies, anyone can open `index.html` in their browser or run a lightweight local server to start hacking. See `app.js` for the core application logic.

## License

MIT © 2026
