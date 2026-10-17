import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

// Library-Build: eine einzelne IIFE-Datei, die Webflow per <script> laedt.
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'BFRechner',
      formats: ['iife'],
      fileName: () => 'rechner.js',
    },
    cssCodeSplit: false,
    target: 'es2020',
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
