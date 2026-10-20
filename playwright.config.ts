// SPDX-License-Identifier: MIT
import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, fullyParallel: false,
  use: {baseURL: 'http://127.0.0.1:38137', headless: true,
    launchOptions: {args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']}},
  webServer: {command: 'node scripts/serve-tests.mjs', url: 'http://127.0.0.1:38137/tests/browser.html', reuseExistingServer: false},
  reporter: 'list'
});
