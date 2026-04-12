# Supabase Configuration

The Birthday App uses Supabase for database persistence and authentication. Below is the required configuration to replicate the backend.

## 1. Database Schema

### `birthdays` Table

```sql
create table public.birthdays (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  birth_date date not null,
  user_id uuid references auth.users(id) on delete cascade not null
);
```

### Row Level Security (RLS)

Enable RLS on the `birthdays` table and add the following policies:

```sql
-- Users can only see their own birthdays
create policy "Users can view their own birthdays"
  on public.birthdays for select
  using (auth.uid() = user_id);

-- Users can only insert their own birthdays
create policy "Users can insert their own birthdays"
  on public.birthdays for insert
  with check (auth.uid() = user_id);

-- Users can only update their own birthdays
create policy "Users can update their own birthdays"
  on public.birthdays for update
  using (auth.uid() = user_id);

-- Users can only delete their own birthdays
create policy "Users can delete their own birthdays"
  on public.birthdays for delete
  using (auth.uid() = user_id);
```

---

## 2. Authentication Settings

### Deep Link Confirmation (Mobile)

To support email confirmation on Android, you must add the custom URL scheme to your Supabase Auth Redirect URLs:

- **Redirect URL**: `com.birthdayapp://confirm`

### Anonymous Sign-in

Enable **Anonymous Sign-ins** in the Supabase Dashboard (Authentication > Providers > Anonymous). This allows for the zero-config guest experience.

---

## 3. Environment Variables

Create a `.env` file in the root of your project:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```
