create table if not exists talk_posts (
  id text primary key,
  nickname text not null default '익명',
  age integer,
  location text,
  mood text not null,
  text text not null check (length(text) between 1 and 80),
  tags text not null default '[]',
  likes integer not null default 0,
  replies integer not null default 0,
  online integer not null default 1,
  created_at text not null default (datetime('now'))
);

create table if not exists chat_rooms (
  id text primary key,
  title text,
  last_message text,
  last_message_at text not null default (datetime('now')),
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists chat_messages (
  id text primary key,
  room_id text not null references chat_rooms(id) on delete cascade,
  sender_nickname text not null default '익명',
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

create index if not exists talk_posts_created_idx on talk_posts(created_at desc);
create index if not exists chat_rooms_last_message_idx on chat_rooms(last_message_at desc);
create index if not exists chat_messages_room_created_idx on chat_messages(room_id, created_at desc);

insert or ignore into chat_rooms (id, title, last_message, last_message_at)
values
  ('room-db-test', 'D1 테스트 채팅방', '이 방은 Cloudflare D1에서 불러온 실제 채팅방이에요.', datetime('now')),
  ('room-image-test', 'R2 이미지 전송 테스트방', '이미지 전송은 R2로 붙일 예정이에요.', datetime('now', '-5 minutes'));
