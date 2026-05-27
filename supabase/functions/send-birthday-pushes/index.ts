import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// The Firebase Service Account JSON string must be saved in Supabase Secrets as FIREBASE_SERVICE_ACCOUNT
// e.g. supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars")

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Get today's month and day (in Malaysia Time, UTC+8)
    const now = new Date()
    // Add 8 hours for UTC+8
    const myTime = new Date(now.getTime() + (8 * 60 * 60 * 1000))
    const month = myTime.getUTCMonth() + 1
    const day = myTime.getUTCDate()
    
    // Format to match birth_date "-MM-DD"
    const monthStr = month.toString().padStart(2, '0')
    const dayStr = day.toString().padStart(2, '0')
    console.log(`Checking for birthdays on month ${month}, day ${day}`)

    // 2. Fetch all birthdays for today using RPC
    const { data: birthdays, error: bError } = await supabase
      .rpc('get_todays_birthdays', { target_month: month, target_day: day })

    if (bError) throw bError
    
    if (!birthdays || birthdays.length === 0) {
      return new Response(JSON.stringify({ message: "No birthdays today" }), { headers: { "Content-Type": "application/json" } })
    }

    console.log(`Found ${birthdays.length} birthday(s) today.`)

    // 3. Collect unique user_ids to send pushes to
    const userIds = [...new Set(birthdays.map(b => b.user_id))]

    // 4. Fetch FCM tokens for those users
    const { data: tokensData, error: tError } = await supabase
      .from('fcm_tokens')
      .select('user_id, token')
      .in('user_id', userIds)

    if (tError) throw tError
    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ message: "No FCM tokens found for users with birthdays" }), { headers: { "Content-Type": "application/json" } })
    }

    // Map user_id to their token
    const userTokens = new Map(tokensData.map(t => [t.user_id, t.token]))

    // 5. Build and send notifications
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is missing")
    const serviceAccount = JSON.parse(serviceAccountStr)

    // Get an OAuth2 token to call the FCM v1 API
    const accessToken = await getFirebaseAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id

    const results = []

    for (const b of birthdays) {
      const token = userTokens.get(b.user_id)
      if (!token) continue

      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
      const payload = {
        message: {
          token: token,
          data: {
            title: `It's ${b.name}'s Birthday! \uD83C\uDF82`,
            body: `Don't forget to wish them a happy birthday today!`,
            birthday_id: b.id.toString()
          },
          android: {
            priority: "high"
          }
        }
      }

      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const resData = await response.json()
      results.push({ user: b.user_id, name: b.name, success: response.ok, response: resData })
    }

    return new Response(JSON.stringify({ message: "Pushes processed", results }), { headers: { "Content-Type": "application/json" } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } })
  }
})

// Helper to generate a short-lived OAuth 2.0 token using JWT (Firebase Admin SDK style)
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const { create } = await import("https://deno.land/x/djwt@v2.9.1/mod.ts")
  
  const header = { alg: "RS256", typ: "JWT" }
  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600 // 1 hour

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: serviceAccount.token_uri,
    iat,
    exp,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  }

  // Convert private key from string
  const pemHeader = "-----BEGIN PRIVATE KEY-----"
  const pemFooter = "-----END PRIVATE KEY-----"
  let privateKeyString = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "")

  const binaryDerString = atob(privateKeyString)
  const binaryDer = new Uint8Array(binaryDerString.length)
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i)
  }

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const jwt = await create(header, payload, cryptoKey)

  const response = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  })

  const data = await response.json()
  if (!response.ok) throw new Error(`Failed to get FCM token: ${data.error_description || data.error}`)
  
  return data.access_token
}
