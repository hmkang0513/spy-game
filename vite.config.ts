import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    // Phaser 본체가 커서 경고 기준을 올린다
    chunkSizeWarningLimit: 2000,
  },
  server: { port: 5173, strictPort: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
