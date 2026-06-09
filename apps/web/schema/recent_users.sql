create table if not exists recent_users (
  id text primary key,
  nickname text not null,
  age integer,
  location text,
  bio text,
  online integer not null default 1,
  last_seen_at text not null default (datetime('now')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists recent_users_last_seen_idx on recent_users(last_seen_at desc);
