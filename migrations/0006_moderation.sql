alter table reports add column admin_note text;
alter table reports add column handled_by text;
alter table reports add column handled_at text;

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
