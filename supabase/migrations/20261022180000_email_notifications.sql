create table public.email_notifications (
  event_key text primary key,
  recipient_email text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.email_notifications enable row level security;
revoke all on public.email_notifications from anon, authenticated;
grant all on public.email_notifications to service_role;
