-- Activations: programs (e.g. bootcamps) whose participants receive an XLM
-- reward once they connect a wallet and verify the email that appears on the
-- activation's participant list before the activation expires.
-- Server-only writes via the service-role key (same pattern as users/audit_logs).

create table if not exists public.activations (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  reward_xlm  numeric(20,7) not null check (reward_xlm > 0),
  expires_at  timestamptz not null,
  created_by  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists activations_touch_updated_at on public.activations;
create trigger activations_touch_updated_at
  before update on public.activations
  for each row
  execute function public.tg_touch_updated_at();

alter table public.activations enable row level security;

create table if not exists public.activation_participants (
  id                uuid        primary key default gen_random_uuid(),
  activation_id     uuid        not null references public.activations(id) on delete cascade,
  email             text        not null check (email = lower(email)),
  status            text        not null default 'pending'
                    check (status in ('pending','payable','paying','paid')),
  matched_wallet    text        references public.users(wallet_address),
  matched_at        timestamptz,
  payout_started_at timestamptz,
  paid_tx_hash      text,
  paid_by           text,
  paid_at           timestamptz,
  paid_amount_xlm   numeric(20,7),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (activation_id, email)
);

create index if not exists activation_participants_email_idx
  on public.activation_participants (email);

create index if not exists activation_participants_activation_status_idx
  on public.activation_participants (activation_id, status);

drop trigger if exists activation_participants_touch_updated_at on public.activation_participants;
create trigger activation_participants_touch_updated_at
  before update on public.activation_participants
  for each row
  execute function public.tg_touch_updated_at();

alter table public.activation_participants enable row level security;

-- Marks pending participants as payable when a user has verified the matching
-- email before the activation expired. Idempotent; only touches 'pending' rows
-- so paid/payable snapshots are never rewritten.
create or replace function public.activation_reconcile(p_activation_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.activation_participants ap
  set status = 'payable',
      matched_wallet = u.wallet_address,
      matched_at = now()
  from public.activations a,
       public.users u
  where ap.activation_id = a.id
    and ap.status = 'pending'
    and u.email = ap.email
    and u.email_verified_at is not null
    and u.email_verified_at <= a.expires_at
    and (p_activation_id is null or ap.activation_id = p_activation_id);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
