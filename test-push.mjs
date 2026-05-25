import { readFileSync } from 'fs';
import { JWT } from 'google-auth-library';
import fetch from 'node-fetch';

const serviceAccount = JSON.parse(readFileSync('birthday-app-f3833-firebase-adminsdk-fbsvc-cef2565577.json', 'utf8'));

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const jwtClient = new JWT({
            email: serviceAccount.client_email,
            key: serviceAccount.private_key,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging']
        });
        jwtClient.authorize((err, tokens) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(tokens.access_token);
        });
    });
}

async function sendPush() {
    try {
        const token = await getAccessToken();
        const fcmToken = "f8CG-TYORPC4uxhEYvYnp_:APA91bFRmdpRdWaUsEMmYDiDVi59yigQmm8aaAFUcvVaJPmD0mnVkA7jfDTVjd3wwx9dgmePQyDQYduQzHgs7rBkJMDqBAehMyF7KVPLGnrRAY_-jx0f78E";
        
        const payload = {
            message: {
                token: fcmToken,
                notification: {
                    title: "🎉 Server Test Success!",
                    body: "This is a test notification from the server! If you see this, background notifications are working perfectly!"
                }
            }
        };

        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("FCM Response:", data);
    } catch (e) {
        console.error("Error sending push:", e);
    }
}

sendPush();
