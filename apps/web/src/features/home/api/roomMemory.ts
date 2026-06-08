import type { D1ChatRoom } from './d1ChatRooms';

const lastKey = 'chitchat.lastOpenRoom.v1';
const mapKey = 'chitchat.openRoomMap.v1';

export function rememberLastRoom(room: D1ChatRoom) {
  localStorage.setItem(lastKey, JSON.stringify(room));
}

export function getRememberedLastRoom(): D1ChatRoom | null {
  try {
    const raw = localStorage.getItem(lastKey);
    return raw ? JSON.parse(raw) as D1ChatRoom : null;
  } catch {
    return null;
  }
}

export function rememberMappedRoom(key: string | number, room: D1ChatRoom) {
  const map = getRoomMap();
  map[String(key)] = room;
  localStorage.setItem(mapKey, JSON.stringify(map));
}

export function getMappedRoom(key: string | number): D1ChatRoom | null {
  return getRoomMap()[String(key)] ?? null;
}

function getRoomMap(): Record<string, D1ChatRoom> {
  try {
    const raw = localStorage.getItem(mapKey);
    return raw ? JSON.parse(raw) as Record<string, D1ChatRoom> : {};
  } catch {
    return {};
  }
}
