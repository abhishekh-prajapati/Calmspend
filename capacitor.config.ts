import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pbp.personalfinance',
  appName: 'CalmSpend',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    App: {},
  },
};

export default config;
