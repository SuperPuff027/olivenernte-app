/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [preact(), basicSsl()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
