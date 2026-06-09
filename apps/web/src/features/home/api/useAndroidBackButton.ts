import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

type BackButtonHandler = () => boolean;

export function useAndroidBackButton(handler: BackButtonHandler) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('backButton', () => {
      const handled = handler();
      if (!handled) App.minimizeApp();
    });

    return () => {
      listener.then((handle) => handle.remove()).catch(() => undefined);
    };
  }, [handler]);
}
