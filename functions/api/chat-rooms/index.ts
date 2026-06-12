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
  participant_a_avatar_url?: string | null;
  participant_b_avatar_url?: string | null;
  room_owner_profile_id?: string | null;
  room_owner_nickname?: string | null;
  peer_avatar_url?: string | null;
};

const DIRECT_CHAT_COST = 100;

async function ensurePointTables(env: Env) {
  await env.DB.prepare(
    `create table if not exists user_points (
      profile_id text primary key,
      balance integer not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    )`,
  ).run();

  await env.DB.prepare(
    `create table if not exists point_transactions (
      id text primary key,
      profile_id text not null,
      amount integer not null,
      reason text not null,
      reference_id text,
      description text,
      created_at text not null default (datetime('now'))
    )`,
  ).run();
}

async function ensurePointAccount(env: Env, profileId: string) {
  await ensurePointTables(env);
  await env.DB.prepare(
    `insert into user_points (profile_id, balance, created_at, updated_at)
     values (?, 0, datetime('now'), datetime('now'))
     on conflict(profile_id) do nothing`,
  ).bind(profileId).run();
}

async function getPointBalance(env: Env, profileId: string) {
  await ensurePointAccount(env, profileId);
  const row = await env.DB.prepare('select balance from user_points where profile_id = ?').bind(profileId).first<{ balance: number }>();
  return Number(row?.balance ?? 0);
}

async function consumePoints(env: Env, profileId: string, amount: number, reason: string, referenceId: string, description: string) {
  await ensurePointAccount(env, profileId);
  const result = await env.DB.prepare(
    `update user_points
     set balance = balance - ?, updated_at = datetime('now')
     where profile_id = ? and balance >= ?`,
  ).bind(amount, profileId, amount).run();

  if ((result.meta.changes ?? 0) < 1) {
    return { ok: false, balance: await getPointBalance(env, profileId) };
  }

  await env.DB.prepare(
    `insert into point_transactions (id, profile_id, amount, reason, reference_id, description)
     values (?, ?, ?, ?, ?, ?)`,
  ).bind(crypto.randomUUID(), profileId, -amount, reason, referenceId, description).run();

  return { ok: true, balance: await getPointBalance(env, profileId) };
}

async function ensureChatRoomColumns(env: Env) {
  const columns = [
    'alter table chat_rooms add column direct_key text',
    'alter table chat_rooms add column participant_a_id text',
    'alter table chat_rooms add column participant_a_nickname text',
    'alter table chat_rooms add column participant_b_id text',
    'alter table chat_rooms add column participant_b_nickname text',
    'alter table chat_rooms add column room_owner_profile_id text',
    'alter table chat_rooms add column room_owner_nickname text',
    'alter table chat_rooms add column updated_at text',
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
    `create table if not exists recent_users (
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
    )`,
  ).run();

  try {
    await env.DB.prepare('alter table recent_users add column avatar_url text').run();
  } catch {
    // column already exists
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
    `create table if not exists chat_room_exits (
      room_id text not null,
      profile_id text not null,
      exited_at text not null default (datetime('now')),
      is_hidden integer not null default 1,
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

  await ensurePointTables(env);
  await env.DB.prepare('create index if not exists user_blocks_blocked_idx on user_blocks(blocked_id)').run();
  await env.DB.prepare('create index if not exists chat_room_exits_profile_idx on chat_room_exits(profile_id, is_hidden)').run();
  await env.DB.prepare('create index if not exists chat_rooms_participant_a_idx on chat_rooms(participant_a_id)').run();
  await env.DB.prepare('create index if not exists chat_rooms_participant_b_idx on chat_rooms(participant_b_id)').run();
  await env.DB.prepare('create index if not exists chat_rooms_owner_idx on chat_rooms(room_owner_profile_id)').run();

  try {
    await env.DB.prepare('create unique index if not exists chat_rooms_direct_key_unique_idx on chat_rooms(direct_key) where direct_key is not null').run();
  } catch {
    // Duplicate legacy direct rooms must be cleaned before this can be enforced.
  }
}

function directKey(a: string, b: string) {
  return [a, b].sort().join(':');
}

function normalizeRoom(room: ChatRoomRow): ChatRoomRow {
  return {
    ...room,
    unread_count: Number(room.unread_count ?? 0),
    room_owner_profile_id: room.room_owner_profile_id || room.participant_a_id || null,
    room_owner_nickname: room.room_owner_nickname || room.participant_a_nickname || null,
  };
}

function displayRoomForViewer(room: ChatRoomRow, viewerId: string) {
  const normalized = normalizeRoom(room);
  if (!normalized.direct_key || !viewerId) return normalized;

  const isA = normalized.participant_a_id === viewerId;
  const otherNickname = isA
    ? normalized.participant_b_nickname
    : normalized.participant_b_id === viewerId
      ? normalized.participant_a_nickname
      : null;
  const peerAvatarUrl = isA ? normalized.participant_b_avatar_url : normalized.participant_a_avatar_url;

  return otherNickname ? { ...normalized, title: `${otherNickname}님과의 대화`, peer_avatar_url: peerAvatarUrl ?? '' } : normalized;
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

async function markRoomAsRead(env: Env, roomId: string, profileId: string) {
  if (!profileId) return;

  await env.DB.prepare(
    `insert into chat_room_reads (room_id, profile_id, last_read_at, updated_at)
     values (?, ?, datetime('now'), datetime('now'))
     on conflict(room_id, profile_id) do update set
       last_read_at = datetime('now'),
       updated_at = datetime('now')`,
  ).bind(roomId, profileId).run();
}

async function viewerNeedsDirectChatCharge(env: Env, roomId: string | null, viewerId: string) {
  if (!roomId) return true;

  const exit = await env.DB.prepare(
    'select is_hidden from chat_room_exits where room_id = ? and profile_id = ? limit 1',
  ).bind(roomId, viewerId).first<{ is_hidden: number }>();

  return Boolean(exit?.is_hidden);
}

async function resetExitedProfilesForNewConversation(env: Env, roomId: string, profileIds: string[]) {
  const uniqueProfileIds = [...new Set(profileIds.filter(Boolean))];
  let resetCount = 0;

  for (const profileId of uniqueProfileIds) {
    const result = await env.DB.prepare(
      `update chat_room_exits
       set exited_at = datetime('now'), is_hidden = 0, updated_at = datetime('now')
       where room_id = ? and profile_id = ?`,
    ).bind(roomId, profileId).run();
    resetCount += result.meta.changes ?? 0;
  }

  if (resetCount > 0) {
    await env.DB.prepare(
      `update chat_rooms
       set last_message = '아직 메시지가 없어요.', last_message_at = datetime('now'), updated_at = datetime('now')
       where id = ?`,
    ).bind(roomId).run();
  }
}

const roomSelectColumns = `r.id, r.title, r.last_message, r.last_message_at, r.created_at,
  r.direct_key, r.participant_a_id, r.participant_a_nickname, r.participant_b_id, r.participant_b_nickname,
  coalesce(r.room_owner_profile_id, r.participant_a_id) as room_owner_profile_id,
  coalesce(r.room_owner_nickname, r.participant_a_nickname) as room_owner_nickname`;

async function listRooms(env: Env, viewerId: string) {
  await ensureChatRoomColumns(env);

  const { results } = await env.DB.prepare(
    `select ${roomSelectColumns},
       au.avatar_url as participant_a_avatar_url,
       bu.avatar_url as participant_b_avatar_url,
       (
         select count(*)
         from chat_messages m
         left join chat_room_reads rr on rr.room_id = r.id and rr.profile_id = ?
         left join chat_room_exits ex on ex.room_id = r.id and ex.profile_id = ?
         where m.room_id = r.id
           and coalesce(m.sender_profile_id, '') != ''
           and m.sender_profile_id != ?
           and datetime(m.created_at) > datetime(coalesce(rr.last_read_at, ex.exited_at, '1970-01-01 00:00:00'))
           and (ex.exited_at is null or datetime(m.created_at) > datetime(ex.exited_at))
       ) as unread_count
     from chat_rooms r
     left join recent_users au on au.id = r.participant_a_id
     left join recent_users bu on bu.id = r.participant_b_id
     where (? = ''
        or r.direct_key is null
        or r.participant_a_id = ?
        or r.participant_b_id = ?
        or r.room_owner_profile_id = ?)
       and (? = '' or not exists (
         select 1 from user_blocks b
         where (b.blocker_id = ? and (b.blocked_id = r.participant_a_id or b.blocked_id = r.participant_b_id))
            or (b.blocked_id = ? and (b.blocker_id = r.participant_a_id or b.blocker_id = r.participant_b_id))
       ))
       and (? = '' or not exists (
         select 1 from chat_room_exits hidden
         where hidden.room_id = r.id and hidden.profile_id = ? and hidden.is_hidden = 1
       ))
     order by r.last_message_at desc
     limit 50`,
  ).bind(
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
    viewerId,
  ).all<ChatRoomRow>();

  return (results ?? []).map((room) => displayRoomForViewer(room, viewerId));
}

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const viewerId = new URL(request.url).searchParams.get('profile_id')?.trim() ?? '';
  const rooms = await listRooms(env, viewerId);

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
      `select ${roomSelectColumns},
        au.avatar_url as participant_a_avatar_url,
        bu.avatar_url as participant_b_avatar_url,
        0 as unread_count
       from chat_rooms r
       left join recent_users au on au.id = r.participant_a_id
       left join recent_users bu on bu.id = r.participant_b_id
       where r.direct_key = ?
       limit 1`,
    ).bind(key).first<ChatRoomRow>();

    const shouldCharge = await viewerNeedsDirectChatCharge(env, existingDirectRoom?.id ?? null, viewerId);

    if (shouldCharge) {
      const payment = await consumePoints(env, viewerId, DIRECT_CHAT_COST, 'direct_chat', key, '쪽지 보내기');
      if (!payment.ok) {
        return Response.json({ error: `포인트가 부족해요. 쪽지를 보내려면 ${DIRECT_CHAT_COST}포인트가 필요해요.`, balance: payment.balance }, { status: 402 });
      }
    }

    if (existingDirectRoom) {
      await resetExitedProfilesForNewConversation(env, existingDirectRoom.id, [viewerId, peerId]);
      await markRoomAsRead(env, existingDirectRoom.id, viewerId);
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
        participant_a_id, participant_a_nickname, participant_b_id, participant_b_nickname,
        room_owner_profile_id, room_owner_nickname
      ) values (?, ?, ?, datetime("now"), ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, title, '아직 메시지가 없어요.', key, aId, aNickname, bId, bNickname, viewerId, viewerNickname).run();

    const room = await env.DB.prepare(
      `select ${roomSelectColumns},
        au.avatar_url as participant_a_avatar_url,
        bu.avatar_url as participant_b_avatar_url,
        0 as unread_count
       from chat_rooms r
       left join recent_users au on au.id = r.participant_a_id
       left join recent_users bu on bu.id = r.participant_b_id
       where r.id = ?`,
    ).bind(id).first<ChatRoomRow>();

    await markRoomAsRead(env, id, viewerId);
    return Response.json(room ? displayRoomForViewer(room, viewerId) : null, { status: 201 });
  }

  const title = body.title?.trim() || '새 채팅방';
  const existingRoom = await env.DB.prepare(
    `select ${roomSelectColumns}, 0 as unread_count
     from chat_rooms r
     where r.title = ? and r.room_owner_profile_id = ?
     order by r.created_at desc
     limit 1`,
  ).bind(title, viewerId).first<ChatRoomRow>();

  if (existingRoom) return Response.json(existingRoom);

  const id = crypto.randomUUID();

  await env.DB.prepare(
    `insert into chat_rooms (id, title, last_message, last_message_at, room_owner_profile_id, room_owner_nickname)
     values (?, ?, ?, datetime("now"), ?, ?)`,
  ).bind(id, title, '아직 메시지가 없어요.', viewerId, viewerNickname).run();

  const room = await env.DB.prepare(
    `select ${roomSelectColumns}, 0 as unread_count from chat_rooms r where r.id = ?`,
  ).bind(id).first<ChatRoomRow>();

  return Response.json(room, { status: 201 });
};
