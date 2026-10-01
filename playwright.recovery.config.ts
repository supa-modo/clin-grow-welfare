import { defineConfig } from '@playwright/test';

// Isolated UI regression checks: every API request is mocked, with no database reset.
export default defineConfig({
  testDir: './tests/recovery',
  timeout: 30_000,
  workers: 1,
  reporter: 'list',
  use: { channel: 'msedge', baseURL: 'http://127.0.0.1:3100', screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm.cmd run preview -- --host 127.0.0.1 --port 3100',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
  },
});
