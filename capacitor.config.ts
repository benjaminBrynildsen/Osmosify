import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.osmosify.app',
  appName: 'Osmosify',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // Enable live reload for development
    // Set CAPACITOR_LIVE_RELOAD=true in your environment
    url: process.env.CAPACITOR_LIVE_RELOAD === 'true' ? 'http://YOUR_IP:3000' : undefined,
    cleartext: process.env.CAPACITOR_LIVE_RELOAD === 'true',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
