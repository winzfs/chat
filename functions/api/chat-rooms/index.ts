type Env = { DB: D1Database };

type ChatRoomBody = {
  title?: string;
  profile_id?: string;
  peer_id?: string;
  peer_nickname?: string;
  viewer_nickname?: string;
};

type ChatRoomRow = {
  id: string;
  title: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  unread_count?: number | null;
  direct_key?: string | null;
  participant_a_id?: string | null;
  participant_a_nickname?: string | null;
  participant_b_id?: string | null;
  participant_b_nickname?: string | null;
};

async function ensureChatRoomColumns(env: Env) {
  const columns = [
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_a_nickname text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column participant_b_nickname text',
    'alter table chat_messages add column sender_profile_id text',
  ];

  for (const query of columns) {
    try {
      await env.DB.prepare(query).run();
    } catch {
      // column already exists
    }
  }

  await env.DB.prepare(
    `create table if not exists chat_room_reads (
      room_id text not null,
      profile_id text not null,
      last_read_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      primary key (room_id, profile_id)
    )`,
  ).run();

  await env.DB.prepare(
    `create table if not exists user_blocks (
      blocker_id text not null,
      blocked_id text not null,
      blocked_nickname text,
      created_at text not null default (datetime('now')),
      primary key (blocker_id, blocked_id)
    )`,
  ).run();

  await env.DB.prepare('create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id)').run();
}

function directKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

function normalizeRoom(room: ChatRoomRow): ChatRoomRow {
  return { ...room, unread_count: Number(room.unread_count ?? 0) };
}

function displayRoomForViewer(room: ChatRoomRow, viewerId: string) {
  const normalized = normalizeRoom(room);
  if (!normalized.direct_key || !viewerId) return normalized;

  const otherNickname = normalized.participant_a_id === viewerId
    ? normalized.participant_b_nickname
    : normalized.participant_b_id === viewerId
      ? normalized.participant_a_nickname
      : null;

  return otherNickname ? { ...normalized, title: `${otherNickname}님과의 대화` } : normalized;
}

async function hasBlockBetween(env: Env, viewerId: string, peerId: string) {
  const row = await env.DB.prepare(
    `select blocker_id from user_blocks
     where (blocker_id = ? and blocked_id = ?)
        or (blocker_id = ? and blocked_id = ?)
     limit 1`,
  ).bind(viewerId, peerId, peerId, viewerId).first();

  return Boolean(row);
}

async function listRooms(env: Env, viewerId: string) {
  await ensureChatRoomColumns(env);

  const { results } = await env.DB.prepare(
    `select r.id, r.title, r.last_message, r.last_message_at, r.created_at,
       r.direct_key, r.participant_a_id, r.participant_a_nickname, r.participant_b_id, r.participant_b_nickname,
       (
         select count(*)
         from chat_messages m
         left join chat_room_reads rr on rr.room_id = r.id and rr.profile_id = ?
         where m.room_id = r.id
           and coalesce(m.sender_profile_id, '') != ''
           and m.sender_profile_id != ?
           and datetime(m.created_at) > datetime(coalesce(rr.last_read_at, '1970-01-01 00:00:00'))
       ) as unread_count
     from chat_rooms r
     where ? = ''
        or r.direct_key is null
        or not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ? and (b.blocked_id = r.participant_a_id or b.blocked_id = r.participant_b_id))
             or (b.blocked_id = ? and (b.blocker_id = r.participant_a_id or b.blocker_id = r.participant_b_id))
        )
     order by r.last_message_at desc
     limit 50`,
  ).bind(viewerId, viewerId, viewerId, viewerId, viewerId).all<ChatRoomRow>();

  return (results ?? []).map((room) => displayRoomForViewer(room, viewerId));
}

async function seedRooms(env: Env) {
  await env.DB.prepare(
    'insert or ignore into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now"))',
  ).bind('room-db-test', 'D1 테스트 채팅방', '이 방은 Cloudflare D1에서 불러온 실제 채팅방이에요.').run();

  await env.DB.prepare(
    'insert or ignore into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now", "-5 minutes"))',
  ).bind('room-image-test', 'R2 이미지 전송 테스트방', '이미지 전송은 R2로 붙일 예정이에요.').run();
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const viewerId = new URL(request.url).searchParams.get('profile_id')?.trim() ?? '';
  let rooms = await listRooms(env, viewerId);

  if (rooms.length === 0) {
    await seedRooms(env);
    rooms = await listRooms(env, viewerId);
  }

  return Response.json({ rooms });
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  await ensureChatRoomColumns(env);

  const body = await request.json() as ChatRoomBody;
  const viewerId = body.profile_id?.trim() ?? '';
  const peerId = body.peer_id?.trim() ?? '';
  const viewerNickname = body.viewer_nickname?.trim().slice(0, 20) || '나';
  const peerNickname = body.peer_nickname?.trim().slice(0, 20) || '상대';

  if (!viewerId) {
    return Response.json({ error: '가입한 사용자만 채팅방을 만들 수 있어요.' }, { status: 401 });
  }

  if (peerId && peerId === viewerId) {
    return Response.json({ error: '내 프로필에는 채팅을 걸 수 없어요.' }, { status: 400 });
  }

  if (peerId && await hasBlockBetween(env, viewerId, peerId)) {
    return Response.json({ error: '차단된 사용자와는 새 채팅방을 만들 수 없어요.' }, { status: 403 });
  }

  if (peerId) {
    const key = directKey(viewerId, peerId);
    const existingDirectRoom = await env.DB.prepare(
      `select id, title, last_message, last_message_at, created_at,
        direct_key, participant_a_id, participant_a_nickname, participant_b_id, participant_b_nickname,
        0 as unread_count
       from chat_rooms
       where direct_key = ?
       limit 1`,
    ).bind(key).first<ChatRoomRow>();

    if (existingDirectRoom) {
      return Response.json(displayRoomForViewer(existingDirectRoom, viewerId));
    }

    const id = crypto.randomUUID();
    const [aId, bId] = [viewerId, peerId].sort();
    const aNickname = aId === viewerId ? viewerNickname : peerNickname;
    const bNickname = bId === viewerId ? viewerNickname : peerNickname;
    const title = `${peerNickname}님과의 대화`;

    await env.DB.prepare(
      `insert into chat_rooms (
        id, title, last_message, last_message_at, direct_key,
        participant_a_id, participant_a_nickname, participant_b_id, participant_b_nickname
      ) values (?, ?, ?, datetime("now"), ?, ?, ?, ?, ?)`,
    ).bind(id, title, '아직 메시지가 없어요.', key, aId, aNickname, bId, bNickname).run();

    const room = await env.DB.prepare(
      `select id, title, last_message, last_message_at, created_at,
        direct_key, participant_a_id, participant_a_nickname, participant_b_id, participant_b_nickname,
        0 as unread_count
       from chat_rooms where id = ?`,
    ).bind(id).first<ChatRoomRow>();

    return Response.json(room ? displayRoomForViewer(room, viewerId) : null, { status: 201 });
  }

  const title = body.title?.trim() || '새 채팅방';
  const existingRoom = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at, 0 as unread_count from chat_rooms where title = ? order by created_at desc limit 1',
  ).bind(title).first();

  if (existingRoom) return Response.json(existingRoom);

  const id = crypto.randomUUID();

  await env.DB.prepare(
    'insert into chat_rooms (id, title, last_message, last_message_at) values (?, ?, ?, datetime("now"))',
  ).bind(id, title, '아직 메시지가 없어요.').run();

  const room = await env.DB.prepare(
    'select id, title, last_message, last_message_at, created_at, 0 as unread_count from chat_rooms where id = ?',
  ).bind(id).first();

  return Response.json(room, { status: 201 });
};

export const onRequestDelete: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim();

  if (!id) {
    return Response.json({ error: 'id가 필요해요.' }, { status: 400 });
  }

  await env.DB.prepare('delete from chat_messages where room_id = ?').bind(id).run();
  await env.DB.prepare('delete from chat_rooms where id = ?').bind(id).run();

  return Response.json({ ok: true });
};