import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../../shared/components/Card';
import {
  createDefaultMyRoom,
  createMyRoomItemFromCatalog,
  defaultMyRoomItems,
  floorOptions,
  getRoomItemAssetPath,
  loadMyRoom,
  roomItemCatalog,
  roomItemCategoryOptions,
  saveMyRoom,
  wallpaperOptions,
  type MyRoom,
  type MyRoomCatalogItem,
  type MyRoomItem,
  type MyRoomItemCategory,
} from '../api/myRoom';
import { getProfileId } from '../api/profileId';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';
import './MyRoomSettingsRestoreControls.css';
import './MyRoomSettingsRestoreOptions.css';
import './MyRoomSettingsRestoreSwatches.css';
import './MyRoomFurnitureThumbs.css';
import './RoomCanvasSelectionFix.css';

type MyRoomEditorMenu = MyRoomItemCategory | 'selected' | 'wallpaper' | 'floor' | 'manage';

const catalogPanels = roomItemCategoryOptions
  .map((option) => ({
    ...option,
    items: roomItemCatalog.filter((item) => item.category === option.id),
  }))
  .filter((option) => option.items.length > 0);

const editorMenus: { id: MyRoomEditorMenu; label: string }[] = [
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

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function normalizeRotation(value: number) {
  return ((Math.round(value / 45) * 45) % 360 + 360) % 360;
}

function clampZIndex(value: number) {
  return Math.min(Math.max(value, 0), 99);
}

function serializeRoom(room: MyRoom) {
  return JSON.stringify({
    wallpaper: room.wallpaper,
    floor: room.floor,
    items: room.items,
  });
}

function duplicateItem(item: MyRoomItem, index: number): MyRoomItem {
  return {
    ...item,
    id: `${item.asset_id}-${Date.now()}-${index}`,
    x: clampPercent(item.x + 4),
    y: clampPercent(item.y + 4),
    z_index: clampZIndex(item.z_index + 1),
  };
}

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

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [savedRoom, setSavedRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [activeMenu, setActiveMenu] = useState<MyRoomEditorMenu>('furniture');
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    loadMyRoom(getProfileId()).then((nextRoom) => {
      if (!isMounted) return;
      setRoom(nextRoom);
      setSavedRoom(nextRoom);
      setSelectedItemId('');
      setIsLoading(false);
    }).catch(() => {
      if (!isMounted) return;
      const fallbackRoom = createDefaultMyRoom();
      setRoom(fallbackRoom);
      setSavedRoom(fallbackRoom);
      setSelectedItemId('');
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = useMemo(() => room.items.find((item) => item.id === selectedItemId) ?? null, [room.items, selectedItemId]);
  const hasUnsavedChanges = useMemo(() => serializeRoom(room) !== serializeRoom(savedRoom), [room, savedRoom]);
  const saveButtonLabel = isSaving ? '저장중' : hasUnsavedChanges ? '저장 필요' : '저장됨';

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setActiveMenu('selected');
  };

  const clearSelection = () => {
    setSelectedItemId('');
  };

  const handleClose = () => {
    if (hasUnsavedChanges && !window.confirm('저장하지 않은 마이룸 변경사항이 있어요. 저장하지 않고 나갈까요?')) {
      return;
    }

    onClose();
  };

  const updateItem = (itemId: string, patcher: (item: MyRoomItem) => MyRoomItem) => {
    setRoom((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? patcher(item) : item),
    }));
  };

  const moveItem = (itemId: string, position: { x: number; y: number }) => {
    updateItem(itemId, (item) => ({ ...item, x: clampPercent(position.x), y: clampPercent(position.y) }));
  };

  const rotateSelectedItem = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, rotation: normalizeRotation((item.rotation ?? 0) + amount) }));
  };

  const changeSelectedItemDepth = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({ ...item, z_index: clampZIndex(item.z_index + amount) }));
  };

  const addCatalogItem = (catalogId: string) => {
    const catalogItem = roomItemCatalog.find((item) => item.catalog_id === catalogId);
    if (!catalogItem) return;

    setRoom((current) => {
      const nextItem = createMyRoomItemFromCatalog(catalogItem, current.items.length);
      setSelectedItemId(nextItem.id);
      setActiveMenu('selected');
      setIsEditorMenuOpen(true);
      return { ...current, items: [...current.items, nextItem] };
    });
    setNotice(`${catalogItem.label}을(를) 방에 추가했어요. 저장을 눌러 반영해주세요.`);
  };

  const removeSelectedItem = () => {
    if (!selectedItem) return;

    setRoom((current) => {
      const nextItems = current.items.filter((item) => item.id !== selectedItem.id);
      setSelectedItemId('');
      return { ...current, items: nextItems };
    });
    setNotice(`${selectedItem.label}을(를) 방에서 치웠어요. 저장을 눌러 반영해주세요.`);
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    setRoom((current) => {
      const nextItem = duplicateItem(selectedItem, current.items.length);
      setSelectedItemId(nextItem.id);
      return { ...current, items: [...current.items, nextItem] };
    });
    setNotice(`${selectedItem.label}을(를) 하나 더 추가했어요. 저장을 눌러 반영해주세요.`);
  };

  const save = async () => {
    if (!hasUnsavedChanges || isSaving) return;

    setIsSaving(true);
    const saved = await saveMyRoom(room);
    setIsSaving(false);

    if (!saved) {
      setNotice('마이룸을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
      return;
    }

    setRoom(saved);
    setSavedRoom(saved);
    setSelectedItemId(saved.items.some((item) => item.id === selectedItemId) ? selectedItemId : '');
    setNotice('마이룸이 저장됐어요. 새 채팅방에도 이 방이 보여요.');
  };

  const resetItems = () => {
    setRoom((current) => ({ ...current, items: defaultMyRoomItems }));
    setSelectedItemId('');
    setNotice('기본 가구 배치로 되돌렸어요. 저장을 눌러 반영해주세요.');
  };

  const clearItems = () => {
    setRoom((current) => ({ ...current, items: [] }));
    setSelectedItemId('');
    setNotice('가구를 비웠어요. 저장을 눌러 반영해주세요.');
  };

  const renderCatalogPanel = (title: string, description: string, items: MyRoomCatalogItem[]) => (
    <div className="my-room-panel-section">
      <div className="my-room-panel-title">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div className="my-room-catalog-grid">
        {items.map((item) => (
          <button key={item.catalog_id} type="button" onClick={() => addCatalogItem(item.catalog_id)}>
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

  const renderEditorPanel = () => {
    const activeCatalogPanel = catalogPanels.find((panel) => panel.id === activeMenu);
    if (activeCatalogPanel) {
      return renderCatalogPanel(activeCatalogPanel.title, activeCatalogPanel.description, activeCatalogPanel.items);
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
              <button type="button" onClick={() => changeSelectedItemDepth(1)}>앞으로</button>
              <button type="button" onClick={() => changeSelectedItemDepth(-1)}>뒤로</button>
              <button type="button" onClick={() => rotateSelectedItem(-45)}>왼쪽 45°</button>
              <button type="button" onClick={() => rotateSelectedItem(45)}>오른쪽 45°</button>
              <button type="button" onClick={duplicateSelectedItem}>복제</button>
              <button className="danger-button" type="button" onClick={removeSelectedItem}>삭제</button>
            </div>
          ) : null}
          <div className="my-room-item-list is-compact-list">
            {room.items.length === 0 && <span>배치된 가구가 없어요.</span>}
            {room.items.map((item) => (
              <button className={selectedItemId === item.id ? 'is-selected' : ''} key={item.id} type="button" onClick={() => selectItem(item.id)}>
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
                onClick={() => setRoom((current) => ({ ...current, wallpaper: option.id }))}
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
                onClick={() => setRoom((current) => ({ ...current, floor: option.id }))}
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
          <button type="button" onClick={resetItems}>기본 배치로</button>
          <button className="danger-button" type="button" onClick={clearItems}>가구 모두 비우기</button>
        </div>
        <p className="my-room-small-hint">새 아이템은 `roomItemCatalog`에 category와 image_path만 연결하면 썸네일과 방 렌더링에 함께 반영돼요.</p>
      </div>
    );
  };

  return (
    <section className="talk-list my-room-editor-screen" aria-label="마이룸 꾸미기">
      <Card className="settings-summary my-room-settings-header">
        <button className="chat-back-button" type="button" onClick={handleClose}>←</button>
        <div className="my-room-header-copy">
          <strong>마이룸 꾸미기</strong>
          <p>{hasUnsavedChanges ? '저장하지 않은 변경사항이 있어요.' : '저장 완료된 상태예요.'}</p>
        </div>
        <button
          className={`my-room-save-chip ${hasUnsavedChanges ? 'needs-save' : 'is-saved'}`}
          disabled={isSaving || isLoading || !hasUnsavedChanges}
          onClick={save}
          type="button"
        >
          {saveButtonLabel}
        </button>
      </Card>

      <Card className="person-card my-room-preview-card is-sticky-preview">
        <div className="my-room-card-title-row">
          <div>
            <strong>배치 편집</strong>
            <p>{hasUnsavedChanges ? '변경사항 저장이 필요해요.' : '가구를 끌어서 옮기고, 빈 바닥을 누르면 선택을 해제해요.'}</p>
          </div>
          <span>{selectedItem ? selectedItem.label : '선택 없음'}</span>
        </div>
        {isLoading ? (
          <p>마이룸을 불러오는 중...</p>
        ) : (
          <RoomCanvas
            isEditing
            onItemMove={moveItem}
            onItemSelect={selectItem}
            onStageClick={clearSelection}
            selectedItemId={selectedItemId}
            room={room}
          />
        )}
        {(notice || hasUnsavedChanges) && <p className="my-room-notice">{notice || '저장하지 않은 변경사항이 있어요.'}</p>}

        <div className={isEditorMenuOpen ? 'my-room-floating-editor is-open' : 'my-room-floating-editor'}>
          <button
            className="my-room-floating-editor-toggle"
            type="button"
            aria-expanded={isEditorMenuOpen}
            onClick={() => setIsEditorMenuOpen((current) => !current)}
          >
            {isEditorMenuOpen ? '접기' : '꾸미기'}
          </button>

          {isEditorMenuOpen && (
            <div className="my-room-floating-editor-panel">
              <div className="my-room-menu-tabs" role="tablist" aria-label="마이룸 편집 메뉴">
                {editorMenus.map((menu) => (
                  <button
                    aria-selected={activeMenu === menu.id}
                    className={activeMenu === menu.id ? 'is-active' : ''}
                    key={menu.id}
                    role="tab"
                    type="button"
                    onClick={() => setActiveMenu(menu.id)}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>
              {renderEditorPanel()}
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
