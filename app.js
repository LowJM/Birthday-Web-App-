document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('birthday-form');
    const nameInput = document.getElementById('person-name');
    const dateInput = document.getElementById('birth-date');
    const listContainer = document.getElementById('birthday-list');

    let birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
    let notificationsNotifiedToday = JSON.parse(localStorage.getItem('notificationsNotifiedToday')) || {};

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Request notification permission on user interaction
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            await Notification.requestPermission();
        }
        
        const name = nameInput.value.trim();
        const dateStr = dateInput.value;

        if (!name || !dateStr) return;

        const newBirthday = {
            id: Date.now().toString(),
            name,
            date: dateStr
        };

        birthdays.push(newBirthday);
        saveBirthdays();
        renderBirthdays();
        
        nameInput.value = '';
        dateInput.value = '';
    });

    function saveBirthdays() {
        localStorage.setItem('birthdays', JSON.stringify(birthdays));
    }

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
        
        // Sometimes diffDays is slightly off (like 365 or 366 for today depending on leap years)
        const isToday = bdate.getUTCMonth() === today.getMonth() && bdate.getUTCDate() === today.getDate();
        
        return {
            nextDate: nextBdate,
            daysLeft: isToday ? 0 : diffDays,
            isToday
        };
    }

    function renderBirthdays() {
        listContainer.innerHTML = '';

        if (birthdays.length === 0) {
            listContainer.innerHTML = '<p class="empty-state">No birthdays saved yet. Add one above!</p>';
            return;
        }

        // Add calculated info and sort
        const enrichedBirthdays = birthdays.map(b => {
            const calc = calculateNextBirthday(b.date);
            return { ...b, ...calc };
        }).sort((a, b) => a.daysLeft - b.daysLeft);

        enrichedBirthdays.forEach(b => {
            const item = document.createElement('div');
            item.className = `birthday-item ${b.isToday ? 'today' : ''}`;
            
            // Format original date
            const bDateObj = new Date(b.date);
            const formattedDate = bDateObj.toLocaleDateString(undefined, { timeZone: 'UTC', month: 'long', day: 'numeric' });
            
            // Format days left string
            let daysLeftStr = b.isToday ? 'Today!' : `In ${b.daysLeft} day${b.daysLeft !== 1 ? 's' : ''}`;

            item.innerHTML = `
                <div class="item-info">
                    <h3>${b.name}</h3>
                    <p>${formattedDate}</p>
                </div>
                <div class="item-meta">
                    <div class="days-left">${daysLeftStr}</div>
                    <button class="delete-btn" data-id="${b.id}">Remove</button>
                </div>
            `;
            
            listContainer.appendChild(item);

            // Handle Notifications
            if (b.isToday && "Notification" in window && Notification.permission === "granted") {
                const todayStr = new Date().toDateString();
                const notifyKey = `${b.id}-${todayStr}`;
                
                if (!notificationsNotifiedToday[notifyKey]) {
                    new Notification("Birthday Reminder! 🎉", {
                        body: `It's ${b.name}'s birthday today! Don't forget to wish them well!`,
                        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Treet_Emoji_with_Cake.png/64px-Treet_Emoji_with_Cake.png"
                    });
                    notificationsNotifiedToday[notifyKey] = true;
                    localStorage.setItem('notificationsNotifiedToday', JSON.stringify(notificationsNotifiedToday));
                }
            }
        });

        // Add delete listeners
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                birthdays = birthdays.filter(b => b.id !== id);
                saveBirthdays();
                renderBirthdays();
            });
        });
    }

    // Initial render
    renderBirthdays();
});
