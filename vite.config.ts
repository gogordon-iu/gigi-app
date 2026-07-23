import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/gigi-app/',
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-bluetooth-classic': path.resolve(__dirname, './web/mocks/react-native-bluetooth-classic.js'),
      'react-native-tcp-socket': path.resolve(__dirname, './web/mocks/react-native-tcp-socket.js'),
      'react-native-safe-area-context': path.resolve(__dirname, './web/mocks/react-native-safe-area-context.tsx'),
    },
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
    ],
  },
  define: {
    // React Native relies on global variables like __DEV__
    __DEV__: JSON.stringify(true),
    global: 'window',
  },
  server: {
    port: 3000,
  },
});
