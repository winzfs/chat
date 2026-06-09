import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chitchat.app',
  appName: 'ChitChat',
  webDir: 'apps/web/dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
