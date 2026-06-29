-- Activation payout asset: per-activation choice of XLM (native) or USDC (issued).
-- reward_amount is the generic reward; reward_xlm is kept for back-compat.

alter table public.activations
  add column if not exists payout_asset text not null default 'XLM',
  add column if not exists reward_amount numeric(20,7);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activations_payout_asset_check'
  ) then
    alter table public.activations
      add constraint activations_payout_asset_check
      check (payout_asset in ('XLM', 'USDC'));
  end if;
end $$;

update public.activations
set reward_amount = reward_xlm
where reward_amount is null;

alter table public.activations
  alter column reward_amount set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activations_reward_amount_check'
  ) then
    alter table public.activations
      add constraint activations_reward_amount_check
      check (reward_amount > 0);
  end if;
end $$;

alter table public.activation_participants
  add column if not exists paid_asset text,
  add column if not exists paid_amount numeric(20,7);
