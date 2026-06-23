import {
  floorOptions,
  getRoomItemAssetPath,
  roomItemCatalog,
  roomItemCategoryOptions,
  wallpaperOptions,
  type MyRoom,
  type MyRoomCatalogItem,
  type MyRoomItem,
} from '../api/myRoom';
import { normalizeRotation, type MyRoomEditorMenu } from '../hooks/useMyRoomEditor';

const catalogPanels = roomItemCategoryOptions
  .map((option) => ({
    ...option,
    items: roomItemCatalog.filter((item) => item.category === option.id),
  }))
  .filter((option) => option.items.length > 0);

export const myRoomEditorMenus: { id: MyRoomEditorMenu; label: string }[] = [
  ...catalogPanels.map((panel) => ({ id: panel.id, label: panel.label })),
  { id: 'selected', label: '선택' },
  { id: 'wallpaper', label: '벽지' },
  { id: 'floor', label: '바닥' },
  { id: 'manage', label: '관리' },
];

const catalogThumbnailIcons: Record<string, string> = {
  bed: '🛏️',
  desk: '🪵',
  'side-desk': '🪵',
  table: '🫖',
  plant: '🪴',
  window: '🪟',
  rug: '☁️',
  frame: '🖼️',
  sofa: '🛋️',
  shelf: '📚',
  lamp: '💡',
};

function CatalogThumbnail({ item }: { item: MyRoomCatalogItem }) {
  const thumbnailPath = getRoomItemAssetPath(item);

  return (
    <span className={`my-room-catalog-thumb ${thumbnailPath ? 'has-image' : ''}`}>
      {thumbnailPath ? (
        <img alt="" aria-hidden="true" draggable={false} src={thumbnailPath} />
      ) : (
        <span aria-hidden="true">{catalogThumbnailIcons[item.item_type] ?? '✨'}</span>
      )}
      <span className="sr-only">{item.label}</span>
    </span>
  );
}

type MyRoomEditorPanelProps = {
  activeMenu: MyRoomEditorMenu;
  room: MyRoom;
  selectedItem: MyRoomItem | null;
  selectedItemId: string;
  onAddCatalogItem: (catalogId: string) => void;
  onChangeDepth: (amount: number) => void;
  onClearItems: () => void;
  onDuplicateSelectedItem: () => void;
  onRemoveSelectedItem: () => void;
  onResetItems: () => void;
  onRotateSelectedItem: (amount: number) => void;
  onSelectItem: (itemId: string) => void;
  onSetFloor: (floor: MyRoom['floor']) => void;
  onSetWallpaper: (wallpaper: MyRoom['wallpaper']) => void;
};

export function MyRoomEditorPanel({
  activeMenu,
  room,
  selectedItem,
  selectedItemId,
  onAddCatalogItem,
  onChangeDepth,
  onClearItems,
  onDuplicateSelectedItem,
  onRemoveSelectedItem,
  onResetItems,
  onRotateSelectedItem,
  onSelectItem,
  onSetFloor,
  onSetWallpaper,
}: MyRoomEditorPanelProps) {
  const activeCatalogPanel = catalogPanels.find((panel) => panel.id === activeMenu);

  if (activeCatalogPanel) {
    return (
      <div className="my-room-panel-section">
        <div className="my-room-panel-title">
          <strong>{activeCatalogPanel.title}</strong>
          <p>{activeCatalogPanel.description}</p>
        </div>
        <div className="my-room-catalog-grid">
          {activeCatalogPanel.items.map((item) => (
            <button key={item.catalog_id} type="button" onClick={() => onAddCatalogItem(item.catalog_id)}>
              <CatalogThumbnail item={item} />
              <span className="my-room-catalog-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeMenu === 'selected') {
    return (
      <div className="my-room-panel-section">
        <div className="my-room-panel-title">
          <strong>선택한 가구</strong>
          <p>{selectedItem ? `${selectedItem.label} · X ${Math.round(selectedItem.x)} / Y ${Math.round(selectedItem.y)} / 깊이 ${selectedItem.z_index} / 회전 ${normalizeRotation(selectedItem.rotation ?? 0)}°` : '가구를 누르면 선택되고, 빈 바닥을 누르면 선택이 해제돼요.'}</p>
        </div>
        {selectedItem ? (
          <div className="my-room-control-grid">
            <button type="button" onClick={() => onChangeDepth(1)}>앞으로</button>
            <button type="button" onClick={() => onChangeDepth(-1)}>뒤로</button>
            <button type="button" onClick={() => onRotateSelectedItem(-45)}>왼쪽 45°</button>
            <button type="button" onClick={() => onRotateSelectedItem(45)}>오른쪽 45°</button>
            <button type="button" onClick={onDuplicateSelectedItem}>복제</button>
            <button className="danger-button" type="button" onClick={onRemoveSelectedItem}>삭제</button>
          </div>
        ) : null}
        <div className="my-room-item-list is-compact-list">
          {room.items.length === 0 && <span>배치된 가구가 없어요.</span>}
          {room.items.map((item) => (
            <button className={selectedItemId === item.id ? 'is-selected' : ''} key={item.id} type="button" onClick={() => onSelectItem(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeMenu === 'wallpaper') {
    return (
      <div className="my-room-panel-section">
        <div className="my-room-panel-title">
          <strong>벽지</strong>
          <p>누르면 바로 미리보기에 반영돼요.</p>
        </div>
        <div className="my-room-option-grid is-menu-grid">
          {wallpaperOptions.map((option) => (
            <button
              className={room.wallpaper === option.id ? 'my-room-option is-selected' : 'my-room-option'}
              key={option.id}
              type="button"
              onClick={() => onSetWallpaper(option.id)}
            >
              <span className={`my-room-swatch wallpaper-${option.id}`} />
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activeMenu === 'floor') {
    return (
      <div className="my-room-panel-section">
        <div className="my-room-panel-title">
          <strong>바닥</strong>
          <p>방 분위기에 맞는 바닥을 골라보세요.</p>
        </div>
        <div className="my-room-option-grid is-menu-grid">
          {floorOptions.map((option) => (
            <button
              className={room.floor === option.id ? 'my-room-option is-selected' : 'my-room-option'}
              key={option.id}
              type="button"
              onClick={() => onSetFloor(option.id)}
            >
              <span className={`my-room-swatch floor-${option.id}`} />
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="my-room-panel-section">
      <div className="my-room-panel-title">
        <strong>방 관리</strong>
        <p>배치를 초기화하거나 가구를 모두 비울 수 있어요.</p>
      </div>
      <div className="my-room-manage-grid">
        <button type="button" onClick={onResetItems}>기본 배치로</button>
        <button className="danger-button" type="button" onClick={onClearItems}>가구 모두 비우기</button>
      </div>
      <p className="my-room-small-hint">새 아이템은 `roomItemCatalog`에 category와 image_path만 연결하면 썸네일과 방 렌더링에 함께 반영돼요.</p>
    </div>
  );
}
