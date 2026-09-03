-- Server-side admin session store. Previously the browser cookie carried
-- its own login timestamp and the server just re-checked it, but anyone
-- with cookie write access to an already-authenticated browser could forge
-- that value freely. The cookie now holds only an opaque, unguessable
-- session id; expires_at (the actual source of truth) lives here instead,
-- where nothing short of service_role write access can alter it.
create table if not exists public.admin_sessions (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists admin_sessions_expires_at_idx
  on public.admin_sessions (expires_at);

alter table public.admin_sessions enable row level security;

revoke all on public.admin_sessions from anon, authenticated, public;
