# Neko Admin

## Setup

1. Copy `.env.example` to `.env.local` and fill the Supabase variables, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` (any random string).

2. Generate a TOTP secret, set it as `ADMIN_TOTP_SECRET`:

   ```bash
   node -e "const {Secret}=require('otpauth'); console.log(new Secret().base32)"
   ```

3. Run the app and open the setup page:

   ```bash
   npm run dev -w admin
   ```

   Visit [http://localhost:3001/setup-totp](http://localhost:3001/setup-totp) and scan the QR code with Google Authenticator (or Authy).

4. Sign in at [http://localhost:3001/login](http://localhost:3001/login).
