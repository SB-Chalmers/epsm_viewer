// SPDX-License-Identifier: MIT
import {mountViewer} from './index.js';
const container = document.getElementById('viewer')!;
try {
  const response = await fetch('./model.json');
  if (!response.ok) throw new Error(`Scene HTTP ${response.status}`);
  const viewer = mountViewer(container, await response.json(), {height: '100vh'});
  window.addEventListener('pagehide', () => viewer.dispose(), {once: true});
} catch (error) {
  container.textContent = `Viewer failed: ${error instanceof Error ? error.message : String(error)}`;
}
