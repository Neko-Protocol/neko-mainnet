create table public.admin_emails (
  email text primary key,
  is_active boolean not null default true,
  added_by text,
  created_at timestamptz not null default now()
);

alter table public.admin_emails enable row level security;

insert into public.admin_emails (email) values
  ('santivillarley1010@gmail.com'),
  ('aaguilar1x@gmail.com'),
  ('fabian@oppialabs.com');
