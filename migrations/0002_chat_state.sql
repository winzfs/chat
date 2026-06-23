create table if not exists chat_room_reads (
  room_id text not null,
  profile_id text not null,
  last_read_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  primary key (room_id, profile_id)
);

create table if not exists chat_room_exits (
  room_id text not null,
  profile_id text not null,
  exited_at text not null default (datetime('now')),
  is_hidden integer not null default 1,
  updated_at text not null default (datetime('now')),
  primary key (room_id, profile_id)
);

create index if not exists chat_room_exits_profile_idx
  on chat_room_exits(profile_id, is_hidden, updated_at);
