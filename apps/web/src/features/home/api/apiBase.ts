import { Capacitor } from '@capacitor/core';

export const NATIVE_API_BASE_URL = 'https://chat-509.pages.dev';

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  if (Capacitor.isNativePlatform()) {
    return `${NATIVE_API_BASE_URL}${path}`;
  }

  return path;
}

export function assetUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('blob:') || path.startsWith('data:')) return path;

  if (Capacitor.isNativePlatform() && path.startsWith('/api/')) {
    return `${NATIVE_API_BASE_URL}${path}`;
  }

  return path;
}
