import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js']
  },
  resolve: {
    alias: {
      '@xterm/xterm': '/tests/mocks/xterm.js',
      '@xterm/addon-fit': '/tests/mocks/xterm-fit.js',
      '/@xterm/xterm/css/xterm.css': '/tests/mocks/empty.css',
      '@xterm/xterm/css/xterm.css': '/tests/mocks/empty.css'
    }
  }
});
