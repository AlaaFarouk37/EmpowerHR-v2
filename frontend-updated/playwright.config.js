const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run e2e:serve',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    env: {
      CI: 'true',
    },
  },
});