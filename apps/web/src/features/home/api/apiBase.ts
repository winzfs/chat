import { Capacitor } from '@capacitor/core';

const NATIVE_API_BASE_URL = 'https://chat-509.pages.dev';

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;

  if (Capacitor.isNativePlatform()) {
    return `${NATIVE_API_BASE_URL}${path}`;
  }

  return path;
}
