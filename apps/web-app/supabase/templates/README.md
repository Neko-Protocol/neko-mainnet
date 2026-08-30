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

## Mailing templates

Mailing templates are **not** stored in this repo. They live in the
`mailing_templates` table in Supabase and are managed from the admin app at
**/analytics/mailing → Templates**.

Each template is a **complete HTML email** — its own header, body, and footer,
including the "Capital Routing Layer for RWAs" brand line. Sending a template
substitutes its variables and nothing else; it is never wrapped or re-branded,
so an admin's preview is exactly what the recipient receives.

Supported variables:

| Token                 | Replaced with                                         |
| --------------------- | ----------------------------------------------------- |
| `{{email}}`           | The recipient's address                               |
| `{{wallet_address}}`  | The recipient's wallet, or empty for admin-list sends |
| `{{unsubscribe_url}}` | Signed one-click opt-out URL                          |

If a template omits `{{unsubscribe_url}}`, an unsubscribe button is appended at
send time so no mailing goes out without an opt-out path. Either way the RFC
8058 `List-Unsubscribe` headers are set.

The `magic-link.html` template above is unrelated: it belongs to Supabase Auth
and is pasted into the Supabase dashboard, not sent through this pipeline.
