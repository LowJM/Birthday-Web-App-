# Birthday Scheduler

> A lightweight, client-side web application to track upcoming birthdays and receive native browser notifications.

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) 
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white) 
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)

## Why This Exists

Missing a friend or family member's birthday is a terrible feeling, but uploading your personal contacts to a third-party server just for reminders is a privacy risk. This application solves the problem by providing a fast, offline-capable way to track birthdays directly in your browser using local storage, without requiring user accounts or sending data externally.

## Quick Start

```bash
# Clone the repository and navigate to the directory
cd "Birthday App"

# Start a local static server
python -m http.server 3000
```

Then visit `http://localhost:3000` in your web browser.

## Installation

**Prerequisites**: A modern web browser (Chrome, Edge, Firefox, Safari) and a local development server (e.g., Python 3, Node.js `http-server`, or a VS Code Live Server extension). No `npm install` is required.

```bash
# Using Node.js http-server instead of Python
npx http-server -p 3000
```

## Usage

### Basic Example

Open the app in your browser and use the UI to add a birthday. Alternatively, you can add data programmatically via the browser console:

```javascript
// Adding a birthday programmatically
const newBirthday = {
    id: Date.now().toString(),
    name: "Jane Doe",
    date: "1990-05-14"
};

const birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
birthdays.push(newBirthday);
localStorage.setItem('birthdays', JSON.stringify(birthdays));

// Refresh the page to see the changes
location.reload();
```

### Configuration

All configuration is handled implicitly via browser native APIs.

| LocalStorage Key | Type | Description |
|--------|------|-------------|
| `birthdays` | `array` | Stores the list of `id`, `name`, and `date` objects. |
| `notificationsNotifiedToday` | `object` | Maps `{id}-{date}` keys to booleans to prevent duplicate notifications. |

### Advanced Usage

If you need to calculate the days remaining until a specific birthday within your own script:

```javascript
function calculateNextBirthday(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const bdate = new Date(dateString);
    let nextBdate = new Date(today.getFullYear(), bdate.getUTCMonth(), bdate.getUTCDate());

    if (nextBdate < today) {
        nextBdate.setFullYear(today.getFullYear() + 1);
    }

    const diffTime = nextBdate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}
```

## API Reference

As this is a vanilla frontend application with no backend, all interactions are through the DOM and the native LocalStorage and Notification APIs. See `app.js` for the core presentation logic. 

For end-user instructions, please see [USER_GUIDE.md](USER_GUIDE.md).

## Contributing

Because this project relies entirely on client-side vanilla web technologies, anyone can open `index.html` in their browser or run a lightweight local server to start hacking.

## License

MIT © 2026
