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
        const fcmToken = "cB9zKtitQ32jxaCUUSuVz6:APA91bHTsYRHdUwkO9DSk9pICFIjCvTDXF6j8GfKs0Tz97y2dxhWk0p9GFZUaozuJCaFgPweNqwyaGoH4qQRnZraDW-7UcxK7bz0rJMPZY9HyZJFA8r1s1I";
        
        const payload = {
            message: {
                token: fcmToken,
                data: {
                    title: "🎉 Test 4 Data Push",
                    body: "This is a DATA ONLY push. Let me know if you see this!"
                },
                android: {
                    priority: "high"
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
        console.log("FCM Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error sending push:", e);
    }
}

sendPush();
