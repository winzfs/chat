import { useEffect, useMemo, useState } from 'react';
import {
  createDefaultMyRoom,
  createMyRoomItemFromCatalog,
  defaultMyRoomItems,
  loadMyRoom,
  roomItemCatalog,
  saveMyRoom,
  type MyRoom,
  type MyRoomItem,
  type MyRoomItemCategory,
} from '../api/myRoom';
import { getProfileId } from '../api/profileId';

export type MyRoomEditorMenu = MyRoomItemCategory | 'selected' | 'wallpaper' | 'floor' | 'manage';

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

export function useMyRoomEditor(onClose: () => void) {
  const [room, setRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [savedRoom, setSavedRoom] = useState<MyRoom>(() => createDefaultMyRoom());
  const [activeMenu, setActiveMenu] = useState<MyRoomEditorMenu>('furniture');
  const [isEditorMenuOpen, setIsEditorMenuOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    loadMyRoom(getProfileId())
      .then((nextRoom) => {
        if (!isMounted) return;
        setRoom(nextRoom);
        setSavedRoom(nextRoom);
        setSelectedItemId('');
        setLoadFailed(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        const fallbackRoom = createDefaultMyRoom();
        setRoom(fallbackRoom);
        setSavedRoom(fallbackRoom);
        setSelectedItemId('');
        setLoadFailed(true);
        setNotice(error instanceof Error ? error.message : '마이룸을 불러오지 못했어요.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = useMemo(
    () => room.items.find((item) => item.id === selectedItemId) ?? null,
    [room.items, selectedItemId],
  );
  const hasUnsavedChanges = useMemo(
    () => serializeRoom(room) !== serializeRoom(savedRoom),
    [room, savedRoom],
  );
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

  const close = () => {
    if (hasUnsavedChanges && !window.confirm('저장하지 않은 마이룸 변경사항이 있어요. 저장하지 않고 나갈까요?')) return;
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
    updateItem(selectedItem.id, (item) => ({
      ...item,
      rotation: normalizeRotation((item.rotation ?? 0) + amount),
    }));
  };

  const changeSelectedItemDepth = (amount: number) => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, (item) => ({
      ...item,
      z_index: clampZIndex(item.z_index + amount),
    }));
  };

  const addCatalogItem = (catalogId: string) => {
    const catalogItem = roomItemCatalog.find((item) => item.catalog_id === catalogId);
    if (!catalogItem) return;

    const nextItem = createMyRoomItemFromCatalog(catalogItem, room.items.length);
    setRoom((current) => ({ ...current, items: [...current.items, nextItem] }));
    setSelectedItemId(nextItem.id);
    setActiveMenu('selected');
    setIsEditorMenuOpen(true);
    setNotice(`${catalogItem.label}을(를) 방에 추가했어요. 저장을 눌러 반영해주세요.`);
  };

  const removeSelectedItem = () => {
    if (!selectedItem) return;

    setRoom((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== selectedItem.id),
    }));
    setSelectedItemId('');
    setNotice(`${selectedItem.label}을(를) 방에서 치웠어요. 저장을 눌러 반영해주세요.`);
  };

  const duplicateSelectedItem = () => {
    if (!selectedItem) return;

    const nextItem = duplicateItem(selectedItem, room.items.length);
    setRoom((current) => ({ ...current, items: [...current.items, nextItem] }));
    setSelectedItemId(nextItem.id);
    setNotice(`${selectedItem.label}을(를) 하나 더 추가했어요. 저장을 눌러 반영해주세요.`);
  };

  const save = async () => {
    if (!hasUnsavedChanges || isSaving || loadFailed) return;

    setIsSaving(true);
    try {
      const saved = await saveMyRoom(room);
      if (!saved) {
        setNotice('마이룸을 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
        return;
      }

      setRoom(saved);
      setSavedRoom(saved);
      setSelectedItemId(saved.items.some((item) => item.id === selectedItemId) ? selectedItemId : '');
      setNotice('마이룸이 저장됐어요. 새 채팅방에도 이 방이 보여요.');
    } finally {
      setIsSaving(false);
    }
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

  const setWallpaper = (wallpaper: MyRoom['wallpaper']) => {
    setRoom((current) => ({ ...current, wallpaper }));
  };

  const setFloor = (floor: MyRoom['floor']) => {
    setRoom((current) => ({ ...current, floor }));
  };

  return {
    activeMenu,
    addCatalogItem,
    changeSelectedItemDepth,
    clearItems,
    clearSelection,
    close,
    duplicateSelectedItem,
    hasUnsavedChanges,
    isEditorMenuOpen,
    isLoading,
    isSaving,
    loadFailed,
    moveItem,
    notice,
    removeSelectedItem,
    resetItems,
    room,
    rotateSelectedItem,
    save,
    saveButtonLabel,
    selectItem,
    selectedItem,
    selectedItemId,
    setActiveMenu,
    setFloor,
    setIsEditorMenuOpen,
    setWallpaper,
  };
}

export { normalizeRotation };
