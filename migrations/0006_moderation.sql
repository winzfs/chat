create table if not exists report_moderation (
  report_id text primary key,
  admin_note text,
  handled_by text,
  handled_at text,
  updated_at text not null default (datetime('now'))
);

create index if not exists report_moderation_handled_at_idx
  on report_moderation(handled_at);

create table if not exists user_suspensions (
  profile_id text primary key,
  reason text not null,
  suspended_until text,
  created_by text not null,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists user_suspensions_until_idx
  on user_suspensions(suspended_until);
