import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import './AppLaunchSplash.css';

const SPLASH_DISPLAY_MS = 1400;
const SPLASH_FADE_MS = 280;

export function AppLaunchSplash() {
  const [isVisible, setIsVisible] = useState(() => Capacitor.isNativePlatform());
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, SPLASH_DISPLAY_MS);

    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, SPLASH_DISPLAY_MS + SPLASH_FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`app-launch-splash${isFading ? ' is-fading' : ''}`} aria-hidden="true">
      <img src="/splash.png" alt="" className="app-launch-splash__image" />
    </div>
  );
}
