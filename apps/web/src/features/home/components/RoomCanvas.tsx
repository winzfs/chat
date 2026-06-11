import type { CSSProperties, MouseEvent, PointerEvent, ReactNode } from 'react';
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

type RoomCanvasProps = {
  room: MyRoom;
  characters?: RoomCharacter[];
  footer?: ReactNode;
  isCompact?: boolean;
  isEditing?: boolean;
  selectedItemId?: string;
  onItemMove?: (itemId: string, position: { x: number; y: number }) => void;
  onItemSelect?: (itemId: string) => void;
  onStageClick?: (position: { x: number; y: number }) => void;
};

const itemIcons: Record<string, string> = {
  bed: '🛏️',
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

function positionFromStagePointer(event: PointerEvent<HTMLElement>) {
  const stage = event.currentTarget.closest('.room-stage') as HTMLElement | null;
  if (!stage) return null;

  const rect = stage.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;

  return { x: clampPercent(x), y: clampPercent(y) };
}

export function RoomCanvas({
  room,
  characters = [],
  footer,
  isCompact = false,
  isEditing = false,
  selectedItemId,
  onItemMove,
  onItemSelect,
  onStageClick,
}: RoomCanvasProps) {
  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onStageClick) return;

    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('.room-character') || target.closest('.room-item')) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    onStageClick({ x: clampPercent(x), y: clampPercent(y) });
  };

  const moveItem = (event: PointerEvent<HTMLElement>, itemId: string) => {
    const position = positionFromStagePointer(event);
    if (!position) return;
    onItemMove?.(itemId, position);
  };

  const handleItemPointerDown = (event: PointerEvent<HTMLDivElement>, item: MyRoomItem) => {
    if (!isEditing) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onItemSelect?.(item.id);
    moveItem(event, item.id);
  };

  const handleItemPointerMove = (event: PointerEvent<HTMLDivElement>, item: MyRoomItem) => {
    if (!isEditing || event.buttons !== 1) return;

    event.preventDefault();
    event.stopPropagation();
    moveItem(event, item.id);
  };

  return (
    <div className={`room-canvas ${isCompact ? 'is-compact' : ''} ${isEditing ? 'is-editing' : ''} wallpaper-${room.wallpaper} floor-${room.floor}`}>
      <div className="room-wall">
        <span className="room-wall-shine" />
      </div>
      <div className="room-stage" onClick={handleClick} role={onStageClick ? 'button' : undefined} tabIndex={onStageClick ? 0 : undefined}>
        <div className="room-floor" />
        {room.items.map((item) => (
          <div
            className={`room-item room-item-${item.item_type} asset-${item.asset_id} ${selectedItemId === item.id ? 'is-selected' : ''}`}
            key={item.id}
            onPointerDown={(event) => handleItemPointerDown(event, item)}
            onPointerMove={(event) => handleItemPointerMove(event, item)}
            style={getItemStyle(item)}
            title={item.label}
          >
            <span className="room-item-shadow" />
            <span className="room-item-icon">{itemIcon(item)}</span>
          </div>
        ))}
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
