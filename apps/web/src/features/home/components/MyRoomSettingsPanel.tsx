import { Card } from '../../../shared/components/Card';
import { useMyRoomEditor } from '../hooks/useMyRoomEditor';
import { MyRoomEditorPanel, myRoomEditorMenus } from './MyRoomEditorPanel';
import { RoomCanvas } from './RoomCanvas';
import './MyRoomSettingsPanel.css';
import './MyRoomSettingsRestoreControls.css';
import './MyRoomSettingsRestoreOptions.css';
import './MyRoomSettingsRestoreSwatches.css';
import './MyRoomFurnitureThumbs.css';
import './RoomCanvasSelectionFix.css';

export function MyRoomSettingsPanel({ onClose }: { onClose: () => void }) {
  const editor = useMyRoomEditor(onClose);

  return (
    <section className="talk-list my-room-editor-screen" aria-label="마이룸 꾸미기">
      <Card className="settings-summary my-room-settings-header">
        <button aria-label="설정으로 돌아가기" className="chat-back-button" type="button" onClick={editor.close}>←</button>
        <div className="my-room-header-copy">
          <strong>마이룸 꾸미기</strong>
          <p>{editor.loadFailed ? '마이룸을 불러오지 못해 저장할 수 없어요.' : editor.hasUnsavedChanges ? '저장하지 않은 변경사항이 있어요.' : '저장 완료된 상태예요.'}</p>
        </div>
        <button
          className={`my-room-save-chip ${editor.hasUnsavedChanges ? 'needs-save' : 'is-saved'}`}
          disabled={editor.isSaving || editor.isLoading || editor.loadFailed || !editor.hasUnsavedChanges}
          onClick={() => void editor.save()}
          type="button"
        >
          {editor.saveButtonLabel}
        </button>
      </Card>

      <Card className="person-card my-room-preview-card is-sticky-preview">
        <div className="my-room-card-title-row">
          <div>
            <strong>배치 편집</strong>
            {!editor.loadFailed && <p>{editor.hasUnsavedChanges ? '변경사항 저장이 필요해요.' : '가구를 끌어서 옮기고, 빈 바닥을 누르면 선택을 해제해요.'}</p>}
          </div>
          <span>{editor.selectedItem ? editor.selectedItem.label : '선택 없음'}</span>
        </div>

        {editor.isLoading ? (
          <p>마이룸을 불러오는 중...</p>
        ) : (
          <RoomCanvas
            isEditing={!editor.loadFailed}
            onItemMove={editor.moveItem}
            onItemSelect={editor.selectItem}
            onStageClick={editor.clearSelection}
            selectedItemId={editor.selectedItemId}
            room={editor.room}
          />
        )}

        {(editor.notice || editor.hasUnsavedChanges) && (
          <p className="my-room-notice" role={editor.loadFailed ? 'alert' : undefined} aria-live="polite">{editor.notice || '저장하지 않은 변경사항이 있어요.'}</p>
        )}

        <div className={editor.isEditorMenuOpen ? 'my-room-floating-editor is-open' : 'my-room-floating-editor'}>
          <button
            aria-expanded={editor.isEditorMenuOpen}
            className="my-room-floating-editor-toggle"
            disabled={editor.isLoading || editor.loadFailed}
            type="button"
            onClick={() => editor.setIsEditorMenuOpen((current) => !current)}
          >
            {editor.isEditorMenuOpen ? '접기' : '꾸미기'}
          </button>

          {editor.isEditorMenuOpen && !editor.loadFailed && (
            <div className="my-room-floating-editor-panel">
              <div className="my-room-menu-tabs" role="tablist" aria-label="마이룸 편집 메뉴">
                {myRoomEditorMenus.map((menu) => (
                  <button
                    aria-selected={editor.activeMenu === menu.id}
                    className={editor.activeMenu === menu.id ? 'is-active' : ''}
                    key={menu.id}
                    role="tab"
                    type="button"
                    onClick={() => editor.setActiveMenu(menu.id)}
                  >
                    {menu.label}
                  </button>
                ))}
              </div>

              <MyRoomEditorPanel
                activeMenu={editor.activeMenu}
                room={editor.room}
                selectedItem={editor.selectedItem}
                selectedItemId={editor.selectedItemId}
                onAddCatalogItem={editor.addCatalogItem}
                onChangeDepth={editor.changeSelectedItemDepth}
                onClearItems={editor.clearItems}
                onDuplicateSelectedItem={editor.duplicateSelectedItem}
                onRemoveSelectedItem={editor.removeSelectedItem}
                onResetItems={editor.resetItems}
                onRotateSelectedItem={editor.rotateSelectedItem}
                onSelectItem={editor.selectItem}
                onSetFloor={editor.setFloor}
                onSetWallpaper={editor.setWallpaper}
              />
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
