import { apiUrl } from './apiBase';
import { getProfileId } from './profileId';

export type MyRoomWallpaper = 'peach' | 'mint' | 'lavender' | 'sky' | 'terracotta' | 'olive' | 'butter' | 'ocean' | 'berry' | 'cobalt' | 'noir';
export type MyRoomFloor = 'cream' | 'wood' | 'checker' | 'carpet' | 'walnut' | 'herringbone' | 'terrazzo' | 'mono-checker' | 'clay-tile' | 'ocean-tile' | 'moss-carpet' | 'night-wood' | 'black-marble';

export type MyRoomItem = {
  id: string;
  item_type: string;
  asset_id: string;
  label: string;
  x: number;
  y: number;
  z_index: number;
  rotation?: number;
};

export type MyRoomCatalogItem = {
  catalog_id: string;
  item_type: string;
  asset_id: string;
  label: string;
  description: string;
  default_x: number;
  default_y: number;
  default_z_index: number;
};

export type MyRoom = {
  profile_id: string;
  wallpaper: MyRoomWallpaper;
  floor: MyRoomFloor;
  items: MyRoomItem[];
  updated_at?: string;
};

export const wallpaperOptions: { id: MyRoomWallpaper; label: string; description: string }[] = [
  { id: 'peach', label: '복숭아빛 방', description: '따뜻하고 부드러운 기본 방' },
  { id: 'mint', label: '민트 방', description: '산뜻하고 편안한 방' },
  { id: 'lavender', label: '라벤더 방', description: '몽글몽글한 보라빛 방' },
  { id: 'sky', label: '하늘 방', description: '맑고 청량한 파란 방' },
  { id: 'terracotta', label: '테라코타 방', description: '햇빛에 구운 흙색의 따뜻한 공간' },
  { id: 'olive', label: '올리브 방', description: '식물과 원목이 잘 어울리는 차분한 초록 방' },
  { id: 'butter', label: '버터옐로우 방', description: '밝고 부드러운 노란빛 포근함' },
  { id: 'ocean', label: '오션틸 방', description: '깊은 바다빛이 도는 청록색 무드' },
  { id: 'berry', label: '베리퍼플 방', description: '진한 베리색 포인트의 개성 있는 방' },
  { id: 'cobalt', label: '코발트 방', description: '선명한 블루가 주는 시원한 팝 무드' },
  { id: 'noir', label: '느와르블랙 방', description: '검은 라운지처럼 고급스럽고 묵직한 방' },
];

export const floorOptions: { id: MyRoomFloor; label: string; description: string }[] = [
  { id: 'cream', label: '크림 바닥', description: '깔끔한 기본 바닥' },
  { id: 'wood', label: '우드 바닥', description: '따뜻한 나무 바닥' },
  { id: 'checker', label: '핑크 체커 바닥', description: '귀여운 체크 패턴' },
  { id: 'carpet', label: '러그 바닥', description: '포근한 카펫 느낌' },
  { id: 'walnut', label: '월넛우드 바닥', description: '진한 원목 느낌의 고급 바닥' },
  { id: 'herringbone', label: '헤링본 바닥', description: '사선 목재 패턴의 클래식한 바닥' },
  { id: 'terrazzo', label: '테라조 바닥', description: '알록달록한 조각감이 있는 트렌디한 바닥' },
  { id: 'mono-checker', label: '흑백체커 바닥', description: '레트로 카페 같은 강한 대비감' },
  { id: 'clay-tile', label: '클레이타일 바닥', description: '따뜻한 점토 타일 느낌' },
  { id: 'ocean-tile', label: '오션타일 바닥', description: '푸른 타일이 주는 시원한 분위기' },
  { id: 'moss-carpet', label: '모스카펫 바닥', description: '이끼색 카펫처럼 차분한 자연 무드' },
  { id: 'night-wood', label: '나이트우드 바닥', description: '어두운 원목의 차분한 밤 분위기' },
  { id: 'black-marble', label: '블랙마블 바닥', description: '블랙 컨셉에 어울리는 고급 대리석 바닥' },
];

export const roomItemCatalog: MyRoomCatalogItem[] = [
  { catalog_id: 'basic-window', item_type: 'window', asset_id: 'basic-window', label: '창문', description: '방 분위기를 밝게 만드는 기본 창문', default_x: 68, default_y: 18, default_z_index: 2 },
  { catalog_id: 'star-bed', item_type: 'bed', asset_id: 'bed01', label: '별침대', description: '별빛 느낌의 포근한 침대', default_x: 14, default_y: 52, default_z_index: 3 },
  { catalog_id: 'wooden-desk', item_type: 'desk', asset_id: 'desk01', label: '나무책상', description: '따뜻한 분위기의 나무 책상', default_x: 54, default_y: 58, default_z_index: 4 },
  { catalog_id: 'wooden-side-desk', item_type: 'side-desk', asset_id: 'sidedesk01', label: '나무협탁', description: '침대 옆에 두기 좋은 작은 나무 협탁', default_x: 28, default_y: 56, default_z_index: 4 },
  { catalog_id: 'round-rug', item_type: 'rug', asset_id: 'round-rug', label: '러그', description: '방 중앙에 까는 둥근 러그', default_x: 46, default_y: 68, default_z_index: 1 },
  { catalog_id: 'heart-rug', item_type: 'rug', asset_id: 'rug01', label: '하트러그', description: '하트 포인트가 있는 포근한 카페트', default_x: 48, default_y: 70, default_z_index: 1 },
  { catalog_id: 'tea-table', item_type: 'table', asset_id: 'tea-table', label: '테이블', description: '대화하기 좋은 작은 테이블', default_x: 58, default_y: 58, default_z_index: 4 },
  { catalog_id: 'small-plant', item_type: 'plant', asset_id: 'small-plant', label: '화분', description: '싱그러운 작은 화분', default_x: 82, default_y: 52, default_z_index: 4 },
  { catalog_id: 'heart-frame', item_type: 'frame', asset_id: 'heart-frame', label: '액자', description: '벽에 거는 작은 액자', default_x: 27, default_y: 22, default_z_index: 2 },
  { catalog_id: 'cozy-sofa', item_type: 'sofa', asset_id: 'cozy-sofa', label: '소파', description: '둘이 앉기 좋은 소파', default_x: 28, default_y: 60, default_z_index: 4 },
  { catalog_id: 'book-shelf', item_type: 'shelf', asset_id: 'book-shelf', label: '책장', description: '아기자기한 책장', default_x: 14, default_y: 31, default_z_index: 3 },
  { catalog_id: 'mood-lamp', item_type: 'lamp', asset_id: 'mood-lamp', label: '스탠드', description: '은은한 분위기의 조명', default_x: 78, default_y: 62, default_z_index: 5 },
];

const defaultCatalogIds = new Set(['basic-window', 'star-bed', 'wooden-desk', 'wooden-side-desk', 'round-rug', 'tea-table']);

export const defaultMyRoomItems: MyRoomItem[] = roomItemCatalog.filter((item) => defaultCatalogIds.has(item.catalog_id)).map((item) => ({
  id: item.catalog_id === 'basic-window' ? 'window-main' : item.catalog_id,
  item_type: item.item_type,
  asset_id: item.asset_id,
  label: item.label,
  x: item.default_x,
  y: item.default_y,
  z_index: item.default_z_index,
  rotation: 0,
}));

function makeItemId(catalogId: string) {
  const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.round(Math.random() * 10000)}`;
  return `${catalogId}-${randomId}`;
}

export function createMyRoomItemFromCatalog(catalogItem: MyRoomCatalogItem, index = 0): MyRoomItem {
  return {
    id: makeItemId(catalogItem.catalog_id),
    item_type: catalogItem.item_type,
    asset_id: catalogItem.asset_id,
    label: catalogItem.label,
    x: Math.min(Math.max(catalogItem.default_x + index * 3, 8), 92),
    y: Math.min(Math.max(catalogItem.default_y + index * 3, 12), 90),
    z_index: catalogItem.default_z_index,
    rotation: 0,
  };
}

export function createDefaultMyRoom(profileId = getProfileId()): MyRoom {
  return {
    profile_id: profileId,
    wallpaper: 'peach',
    floor: 'cream',
    items: defaultMyRoomItems,
  };
}

function normalizeLegacyAssetId(item: MyRoomItem): MyRoomItem {
  if (item.item_type === 'bed' && (item.asset_id === 'soft-bed' || item.asset_id === 'bed01' || item.label === '침대')) {
    return { ...item, asset_id: 'bed01', label: '별침대' };
  }

  return item;
}

function normalizeRoom(room?: Partial<MyRoom> | null, profileId = getProfileId()): MyRoom {
  const items = Array.isArray(room?.items) ? room.items.map(normalizeLegacyAssetId) : defaultMyRoomItems;

  return {
    ...createDefaultMyRoom(profileId),
    ...room,
    profile_id: room?.profile_id || profileId,
    items,
  };
}

export async function loadMyRoom(profileId = getProfileId()): Promise<MyRoom> {
  const params = new URLSearchParams({ profile_id: profileId });
  const response = await fetch(apiUrl(`/api/my-room?${params.toString()}`), { cache: 'no-store' });

  if (!response.ok) {
    return createDefaultMyRoom(profileId);
  }

  const data = await response.json() as { room?: MyRoom };
  return normalizeRoom(data.room, profileId);
}

export async function saveMyRoom(room: MyRoom): Promise<MyRoom | null> {
  const response = await fetch(apiUrl('/api/my-room'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(room),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { room?: MyRoom };
  return normalizeRoom(data.room, room.profile_id);
}
