import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    // Defines i32(), u32() and the other AssemblyScript builtins so the same
    // assembly/ sources also run as plain TypeScript (portable mode).
    setupFiles: ['tests/setup-portable.ts'],
    coverage: {
      provider: 'v8',
      include: ['assembly/**/*.ts'],
      reportsDirectory: 'coverage',
      reporter: ['text', 'html'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
    },
  },
});
