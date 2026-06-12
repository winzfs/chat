import { memo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { MyRoom, MyRoomItem } from '../api/myRoom';
import './RoomCanvas.css';

export type RoomCharacter = {
  id: string;
  label: string;
  x: number;
  y: number;
  variant: 'me' | 'peer' | 'owner';
  bubble?: string;
};

export type RoomChatHistoryLine = {
  id: string;
  sender: string;
  body: string;
  time?: string;
  isMine?: boolean;
};

type RoomCanvasProps = {
  room: MyRoom;
  characters?: RoomCharacter[];
  chatHistoryLines?: RoomChatHistoryLine[];
  footer?: ReactNode;
  isCompact?: boolean;
  isEditing?: boolean;
  selectedItemId?: string;
  onItemMove?: (itemId: string, position: { x: number; y: number }) => void;
  onItemSelect?: (itemId: string) => void;
  onStageClick?: (position: { x: number; y: number }) => void;
};

type DragState = {
  itemId: string;
  element: HTMLDivElement;
  pointerId: number;
  position: { x: number; y: number };
  frameId: number | null;
};

const itemIcons: Record<string, string> = {
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

const furnitureAssetPaths: Record<string, string> = {
  bed01: '/assets/room/furniture/bed01.png',
  desk01: '/assets/room/furniture/desk01.png',
  sidedesk01: '/assets/room/furniture/sidedesk01.png',
  rug01: '/assets/room/furniture/rug01.png',
  'soft-bed': '/assets/room/furniture/bed01.png',
};

function clampPercent(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function getItemStyle(item: MyRoomItem): CSSProperties {
  return {
    left: `${clampPercent(item.x)}%`,
    top: `${clampPercent(item.y)}%`,
    zIndex: item.z_index,
    transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)`,
  };
}

function getCharacterStyle(character: RoomCharacter): CSSProperties {
  return {
    left: `${clampPercent(character.x)}%`,
    top: `${clampPercent(character.y)}%`,
    transform: 'translate(-50%, -50%)',
  };
}

function itemIcon(item: MyRoomItem) {
  return itemIcons[item.item_type] ?? '✨';
}

function itemAssetPath(item: MyRoomItem) {
  return furnitureAssetPaths[item.asset_id] ?? '';
}

function RoomItemContent({ item }: { item: MyRoomItem }) {
  const [imageFailed, setImageFailed] = useState(false);
  const assetPath = itemAssetPath(item);

  if (assetPath && !imageFailed) {
    return <img alt={item.label} className="room-item-image" draggable={false} onError={() => setImageFailed(true)} src={assetPath} />;
  }

  return <span className="room-item-emoji">{itemIcon(item)}</span>;
}

function positionFromStagePointer(event: PointerEvent<HTMLElement>) {
  const stage = event.currentTarget.closest('.room-stage') as HTMLElement | null;
  if (!stage) return null;

  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  return { x: clampPercent(x), y: clampPercent(y) };
}

function applyItemDomPosition(element: HTMLElement, position: { x: number; y: number }) {
  element.style.left = `${position.x}%`;
  element.style.top = `${position.y}%`;
}

function RoomCanvasComponent({
  room,
  characters = [],
  chatHistoryLines = [],
  footer,
  isCompact = false,
  isEditing = false,
  selectedItemId,
  onItemMove,
  onItemSelect,
  onStageClick,
}: RoomCanvasProps) {
  const dragStateRef = useRef<DragState | null>(null);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onStageClick) return;

    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('.room-chat-history') || target.closest('.room-character') || target.closest('.room-item')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    onStageClick({ x: clampPercent(x), y: clampPercent(y) });
  };

  const scheduleDomMove = (element: HTMLDivElement, position: { x: number; y: number }) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    dragState.position = position;

    if (dragState.frameId !== null) return;

    dragState.frameId = requestAnimationFrame(() => {
      const latestState = dragStateRef.current;
      if (!latestState) return;

      applyItemDomPosition(element, latestState.position);
      latestState.frameId = null;
    });
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    event.preventDefault();
    event.stopPropagation();

    if (dragState.frameId !== null) {
      cancelAnimationFrame(dragState.frameId);
      applyItemDomPosition(dragState.element, dragState.position);
    }

    try {
      dragState.element.releasePointerCapture(dragState.pointerId);
    } catch {
      // pointer capture may already be released
    }

    dragState.element.classList.remove('is-dragging');
    dragStateRef.current = null;
    onItemMove?.(dragState.itemId, dragState.position);
  };

  const handleItemPointerDown = (event: PointerEvent<HTMLDivElement>, item: MyRoomItem) => {
    if (!isEditing) return;

    event.preventDefault();
    event.stopPropagation();

    const position = positionFromStagePointer(event) ?? { x: item.x, y: item.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
    onItemSelect?.(item.id);

    dragStateRef.current = {
      itemId: item.id,
      element: event.currentTarget,
      pointerId: event.pointerId,
      position,
      frameId: null,
    };
  };

  const handleItemPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!isEditing || !dragState || event.pointerId !== dragState.pointerId) return;

    const position = positionFromStagePointer(event);
    if (!position) return;

    event.preventDefault();
    event.stopPropagation();
    scheduleDomMove(event.currentTarget, position);
  };

  const handleItemPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    finishDrag(event);
  };

  return (
    <div className={`room-canvas ${isCompact ? 'is-compact' : ''} ${isEditing ? 'is-editing' : ''} wallpaper-${room.wallpaper} floor-${room.floor}`}>
      <div className="room-wall">
        <span className="room-wall-shine" />
      </div>
      <div className="room-stage" onClick={handleClick} role={onStageClick ? 'button' : undefined} tabIndex={onStageClick ? 0 : undefined}>
        <div className="room-floor" />
        {chatHistoryLines.length > 0 && (
          <div className="room-chat-history" aria-label="최근 채팅 기록">
            {chatHistoryLines.map((line) => (
              <div className={line.isMine ? 'room-chat-history-line is-me' : 'room-chat-history-line'} key={line.id}>
                <span className="room-chat-history-copy"><b>{line.sender}:</b> {line.body}</span>
                {line.time && <time className="room-chat-history-time">{line.time}</time>}
              </div>
            ))}
          </div>
        )}
        {room.items.map((item) => {
          const hasImage = Boolean(itemAssetPath(item));

          return (
            <div
              className={`room-item room-item-${item.item_type} asset-${item.asset_id} ${selectedItemId === item.id ? 'is-selected' : ''}`}
              key={item.id}
              onPointerCancel={handleItemPointerCancel}
              onPointerDown={(event) => handleItemPointerDown(event, item)}
              onPointerMove={handleItemPointerMove}
              onPointerUp={finishDrag}
              style={getItemStyle(item)}
              title={item.label}
            >
              <span className="room-item-shadow" />
              <span className={`room-item-icon ${hasImage ? 'has-image' : ''}`}><RoomItemContent item={item} /></span>
            </div>
          );
        })}
        {characters.map((character) => (
          <div className={`room-character is-${character.variant}`} key={character.id} style={getCharacterStyle(character)}>
            {character.bubble && <div className="room-speech-bubble">{character.bubble}</div>}
            <div className="room-character-body">
              <span className="room-character-face">•ᴗ•</span>
            </div>
            <span className="room-character-name">{character.label}</span>
          </div>
        ))}
      </div>
      {footer && <div className="room-canvas-footer">{footer}</div>}
    </div>
  );
}

export const RoomCanvas = memo(RoomCanvasComponent);
