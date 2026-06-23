export type ValidatedImage = {
  bytes: ArrayBuffer;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
};

function isJpeg(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array) {
  return bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
}

export async function validateImageFile(file: FormDataEntryValue | null, maxBytes: number) {
  if (!(file instanceof File)) {
    return { error: '이미지 파일이 필요해요.' } as const;
  }

  if (file.size < 1 || file.size > maxBytes) {
    return { error: `이미지는 ${Math.floor(maxBytes / 1024 / 1024)}MB 이하만 업로드할 수 있어요.` } as const;
  }

  const bytes = await file.arrayBuffer();
  const header = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16));

  if (isJpeg(header)) {
    return { image: { bytes, contentType: 'image/jpeg', extension: 'jpg' } satisfies ValidatedImage } as const;
  }
  if (isPng(header)) {
    return { image: { bytes, contentType: 'image/png', extension: 'png' } satisfies ValidatedImage } as const;
  }
  if (isWebp(header)) {
    return { image: { bytes, contentType: 'image/webp', extension: 'webp' } satisfies ValidatedImage } as const;
  }

  return { error: 'JPEG, PNG, WebP 이미지 파일만 업로드할 수 있어요.' } as const;
}
