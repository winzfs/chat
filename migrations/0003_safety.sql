create table if not exists user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  blocked_nickname text,
  created_at text not null default (datetime('now')),
  primary key (blocker_id, blocked_id)
);

create index if not exists user_blocks_blocked_idx
  on user_blocks(blocked_id);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  reported_id text not null,
  reported_nickname text,
  room_id text,
  reason text not null,
  detail text,
  status text not null default 'open',
  created_at text not null default (datetime('now'))
);

create index if not exists reports_status_created_idx
  on reports(status, created_at desc);

create index if not exists reports_reported_idx
  on reports(reported_id, created_at desc);
