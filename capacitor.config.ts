import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.flirting.app',
  appName: '플러팅',
  webDir: 'apps/web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
