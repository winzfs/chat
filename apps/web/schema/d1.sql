create table if not exists talk_posts (
  id text primary key,
  profile_id text,
  nickname text not null default '익명',
  age integer,
  location text,
  avatar_url text,
  mood text not null,
  text text not null check (length(text) between 1 and 80),
  tags text not null default '[]',
  likes integer not null default 0,
  replies integer not null default 0,
  online integer not null default 1,
  created_at text not null default (datetime('now'))
);

create table if not exists recent_users (
  id text primary key,
  nickname text not null,
  age integer,
  location text,
  bio text,
  avatar_url text,
  online integer not null default 1,
  last_seen_at text not null default (datetime('now')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists chat_rooms (
  id text primary key,
  title text,
  last_message text,
  last_message_at text not null default (datetime('now')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  direct_key text,
  participant_a_id text,
  participant_a_nickname text,
  participant_b_id text,
  participant_b_nickname text,
  room_owner_profile_id text,
  room_owner_nickname text
);

create table if not exists chat_messages (
  id text primary key,
  room_id text not null references chat_rooms(id) on delete cascade,
  sender_nickname text not null default '익명',
  sender_profile_id text,
  message_type text not null default 'text' check (message_type in ('text', 'image')),
  body text,
  image_key text,
  image_url text,
  created_at text not null default (datetime('now')),
  check (
    (message_type = 'text' and body is not null and length(body) between 1 and 500)
    or
    (message_type = 'image' and image_key is not null)
  )
);

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

create table if not exists user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  blocked_nickname text,
  created_at text not null default (datetime('now')),
  primary key (blocker_id, blocked_id)
);

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

create table if not exists user_points (
  profile_id text primary key,
  balance integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists point_transactions (
  id text primary key,
  profile_id text not null,
  amount integer not null,
  reason text not null,
  reference_id text,
  description text,
  created_at text not null default (datetime('now'))
);

create table if not exists daily_point_claims (
  profile_id text not null,
  claim_type text not null,
  claim_date text not null,
  amount integer not null,
  created_at text not null default (datetime('now')),
  primary key (profile_id, claim_type, claim_date)
);

create table if not exists my_rooms (
  profile_id text primary key,
  wallpaper text not null default 'peach',
  floor text not null default 'cream',
  items text not null default '[]',
  updated_at text not null default (datetime('now'))
);

create index if not exists talk_posts_created_idx on talk_posts(created_at desc);
create index if not exists recent_users_last_seen_idx on recent_users(last_seen_at desc);
create index if not exists chat_rooms_last_message_idx on chat_rooms(last_message_at desc);
create index if not exists chat_messages_room_created_idx on chat_messages(room_id, created_at desc);
create index if not exists chat_room_reads_profile_idx on chat_room_reads(profile_id, updated_at desc);
create index if not exists chat_room_exits_profile_idx on chat_room_exits(profile_id, is_hidden);
create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id);
create index if not exists reports_status_created_idx on reports(status, created_at desc);
create index if not exists reports_reported_idx on reports(reported_id, created_at desc);
create index if not exists point_transactions_profile_idx on point_transactions(profile_id, created_at desc);

insert or ignore into chat_rooms (id, title, last_message, last_message_at)
values
  ('room-db-test', 'D1 테스트 채팅방', '이 방은 Cloudflare D1에서 불러온 실제 채팅방이에요.', datetime('now')),
  ('room-image-test', 'R2 이미지 전송 테스트방', '이미지 전송은 R2로 붙일 예정이에요.', datetime('now', '-5 minutes'));
