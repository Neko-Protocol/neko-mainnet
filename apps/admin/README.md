# Neko Admin

## Setup

1. Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SESSION_SECRET` (any random string used to sign session cookies).

2. Create the `admin_users` table in your Supabase project by running [`apps/admin/supabase/migrations/0001_admin_users.sql`](supabase/migrations/0001_admin_users.sql) in the SQL Editor. See [`apps/admin/supabase/README.md`](supabase/README.md).

3. Run the app:

   ```bash
   npm run dev -w admin
   ```

4. Open [http://localhost:3001/setup-totp](http://localhost:3001/setup-totp), generate a QR for the admin email, scan it, bcrypt-hash the password, and insert the row into `admin_users` (details in [`supabase/README.md`](supabase/README.md)).

5. Sign in at [http://localhost:3001/login](http://localhost:3001/login).
