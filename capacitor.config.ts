import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dz.rebhi.app',
  appName: 'ربحي',
  webDir: 'www',
  plugins: {
    AdMob: {
      // Test ad unit ID from Google - works without AdMob account
      // Replace with your real ad unit IDs from https://apps.admob.com
      testingDevices: [],
      initializeForTesting: true,
    },
  },
};

export default config;
