# Supabase Auth Email Templates

## URL Configuration

In Supabase Dashboard, open **Authentication > URL Configuration**.

- Site URL: `https://dapp.nekoprotocol.xyz`
- Redirect URLs:
  - `https://dapp.nekoprotocol.xyz/auth/email-confirmed**`
  - `http://localhost:3000/**` for local development only

The `/auth/email-confirmed` redirect URL is used by Supabase's default
`{{ .ConfirmationURL }}` flow. The custom `magic-link.html` template links
directly to the app's server-side confirmation endpoint.

The app also needs this production environment variable:

```env
NEXT_PUBLIC_APP_URL=https://dapp.nekoprotocol.xyz
```

## Magic Link Template

For hosted Supabase, paste `magic-link.html` into **Authentication > Email
Templates > Magic Link**.

The template links directly to:

```text
{{ .SiteURL }}/api/users/email/confirm?wallet={{ .Data.wallet_address }}&token_hash={{ .TokenHash }}&type=magiclink
```

`wallet_address` is sent as Supabase user metadata by the app when it calls
`signInWithOtp`.

If you prefer Supabase's default implicit redirect flow, keep the default
`{{ .ConfirmationURL }}` link. The app supports that through
`/auth/email-confirmed`.
