# Admin Supabase schema

## Applying the migration

Run the SQL in [`migrations/0001_admin_users.sql`](./migrations/0001_admin_users.sql) in the **Supabase SQL Editor** (same project used by `NEXT_PUBLIC_SUPABASE_URL`). This creates the `admin_users` table with Row Level Security enabled and no anon policies — only requests using the **service role** key (as the admin Next.js app does) can read or write rows.

## Adding an admin user

Provisioning is intentional and manual:

1. Open the admin app and go to `/setup-totp` (for example `http://localhost:3001/setup-totp` while developing — see the main admin app README).
2. Enter the admin email and click **Generate QR**. Scan the QR with Google Authenticator or Authy, or note the displayed Base32 secret.
3. Hash your password locally (example using bcrypt with cost 10):
   ```bash
   node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',10).then(console.log)"
   ```
4. In the **Supabase dashboard** → **Table Editor** → `admin_users` → **Insert** a row (or **SQL Editor**), for example:
   ```sql
   INSERT INTO admin_users (email, password_hash, totp_secret)
   VALUES ('you@example.com', '$2b$10$...your_hash...', 'YOUR_BASE32_SECRET');
   ```
5. Sign in at `/login`.

`is_active` defaults to `true`. Use the dashboard to deactivate an admin by setting `is_active` to `false` if needed.
