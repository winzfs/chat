import { useEffect, useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropToSquare(src: string, zoom: number, offsetX: number, offsetY: number) {
  const image = await loadImage(src);
  const canvas = document.createElement('canvas');
  const size = 512;
  const context = canvas.getContext('2d');

  if (!context) return null;

  canvas.width = size;
  canvas.height = size;

  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const x = (size - width) / 2 + offsetX;
  const y = (size - height) / 2 + offsetY;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.drawImage(image, x, y, width, height);

  return new Promise<File | null>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], 'profile-avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

export function AvatarCropModal({ imageUrl, onApply, onClose }: { imageUrl: string; onApply: (file: File) => void; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }, [imageUrl]);

  const apply = async () => {
    setIsWorking(true);
    const file = await cropToSquare(imageUrl, zoom, offsetX, offsetY);
    setIsWorking(false);
    if (file) onApply(file);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <Card className="avatar-crop-card">
        <strong>프로필 사진 맞추기</strong>
        <p>정사각형 영역에 얼굴이 잘 보이도록 위치와 크기를 맞춰주세요.</p>
        <div className="avatar-crop-preview">
          <img
            src={imageUrl}
            style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})` }}
          />
        </div>
        <label>확대<input type="range" min="1" max="2.6" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
        <label>가로 위치<input type="range" min="-120" max="120" step="2" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label>
        <label>세로 위치<input type="range" min="-120" max="120" step="2" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label>
        <div className="crop-actions">
          <button className="secondary-button" type="button" onClick={onClose}>취소</button>
          <Button type="button" onClick={apply}>{isWorking ? '적용 중...' : '적용하기'}</Button>
        </div>
      </Card>
    </div>
  );
}
