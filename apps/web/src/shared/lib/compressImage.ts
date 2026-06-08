const targetBytes = 300 * 1024;
const maxWidth = 1280;
const maxHeight = 1280;

async function fileToBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' });
}

function getResizeSize(width: number, height: number) {
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지를 압축하지 못했어요.'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality,
    );
  });
}

export async function compressImageToWebp(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const bitmap = await fileToBitmap(file);
  const size = getResizeSize(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = size.width;
  canvas.height = size.height;

  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();

  let bestBlob = await canvasToBlob(canvas, 0.82);
  let quality = 0.72;

  while (bestBlob.size > targetBytes && quality >= 0.38) {
    bestBlob = await canvasToBlob(canvas, quality);
    quality -= 0.08;
  }

  const compressedName = file.name.replace(/\.[^.]+$/, '') || 'image';

  return new File([bestBlob], `${compressedName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
