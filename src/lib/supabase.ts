import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      async getItem(key) {
        const { value } = await Preferences.get({ key });
        return value;
      },
      async setItem(key, value) {
        await Preferences.set({ key, value });
      },
      async removeItem(key) {
        await Preferences.remove({ key });
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export type Birthday = {
  id: string
  name: string
  birth_date: string
  user_id: string
}
