alter table public.invitations
  add column if not exists accepted_notes text,
  add column if not exists volume_moved   numeric(18, 2);
