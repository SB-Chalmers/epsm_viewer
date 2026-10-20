// SPDX-License-Identifier: MIT
import {test, expect} from '@playwright/test';

const sample = () => ({schema: 'epsm.scene/1', units: 'm', up_axis: 'Z',
  report: {geometry_only: true}, diagnostics: {}, preparation: null, internal_mass: {}, objects: [
    {id: 'wall', name: 'Wall <img src=x onerror=alert(1)>', kind: 'surface',
      vertices: [[0,0,0],[8,0,0],[8,0,6],[0,0,6]], holes: [[[2,0,1],[4,0,1],[4,0,3],[2,0,3]]],
      metadata: {physical_element_id: 'physical-wall', storey: 1}, epjson: {surface_type: 'Wall'}},
    {id: 'context-roof', name: 'Neighbour roof', kind: 'context',
      vertices: [[12,0,5],[18,0,5],[18,7,5],[12,7,5]], holes: [], metadata: {surface_type: 'Roof'}}
  ]});

test('embedded viewer renders, selects safely, isolates instances and releases canvases', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  await page.evaluate(scene => (window as any).create(scene), sample());
  await expect(page.locator('#viewer canvas')).toHaveCount(1);
  await expect(page.locator('#viewer #status')).toContainText('2 geometry objects');
  await page.evaluate(() => (window as any).viewer.setSelection('wall'));
  await expect(page.locator('#viewer #details')).toContainText('physical-wall');
  await expect(page.locator('#viewer #details img')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).selections.at(-1).objectId)).toBe('wall');
  await page.locator('#viewer #cutaway').check();
  await expect(page.locator('#viewer #clip')).toBeEnabled();
  await page.locator('#viewer #fit-context').click();
  await page.locator('#viewer #context').uncheck();
  await page.evaluate(scene => (window as any).createSecond(scene), sample());
  await expect(page.locator('#second #context')).toBeChecked();
  await page.screenshot({path: 'test-results/embedded-viewer.png', fullPage: true});
  await page.evaluate(() => {(window as any).viewer.dispose(); (window as any).viewer.dispose(); (window as any).second.dispose();});
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('scene updates handle empty drafts and reject invalid replacement without losing current data', async ({page}) => {
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  await page.evaluate(scene => (window as any).create(scene), sample());
  const message = await page.evaluate(() => {
    try {(window as any).viewer.setScene({schema: 'bad'});} catch (error) {return String(error);}
  });
  expect(message).toContain('schema');
  await expect(page.locator('#viewer #objects option')).toHaveCount(3);
  await page.evaluate(scene => (window as any).viewer.setScene({...scene, objects: []}), sample());
  await expect(page.locator('#viewer #status')).toContainText('0 geometry objects');
  await expect(page.locator('#viewer canvas')).toHaveCount(1);
  await page.evaluate(() => (window as any).viewer.fit());
  await page.evaluate(() => (window as any).viewer.dispose());
});

test('Core-generated draft payload is consumed unchanged by the browser package', async ({page}) => {
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  await page.evaluate(async () => {
    const scene = await fetch('/tests/fixtures/core-scene.json').then(response => response.json());
    (window as any).create(scene);
  });
  await expect(page.locator('#viewer canvas')).toHaveCount(1);
  await expect(page.locator('#viewer #status')).toContainText('geometry objects');
  await page.screenshot({path: 'test-results/core-draft.png'});
  await page.evaluate(() => (window as any).viewer.dispose());
});

test('duplicate labels select their distinct IDs', async ({page}) => {
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  const scene = sample();
  scene.objects.forEach(object => object.name = 'Same display label');
  await page.evaluate(scene => (window as any).create(scene), scene);
  await page.locator('#viewer #objects').selectOption({index: 1});
  expect(await page.evaluate(() => (window as any).selections.at(-1).objectId)).toBe('wall');
  await page.locator('#viewer #objects').selectOption({index: 2});
  expect(await page.evaluate(() => (window as any).selections.at(-1).objectId)).toBe('context-roof');
  await page.evaluate(() => (window as any).viewer.dispose());
});

test('failed early renderer setup releases its GPU context', async ({page}) => {
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  const result = await page.evaluate(scene => {
    const contexts: WebGLRenderingContext[] = [];
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(...args: any[]) {
      const context = (original as any).apply(this,args);
      if (args[0] === 'webgl2' && context) contexts.push(context);
      return context;
    } as any;
    const observer = window.ResizeObserver;
    window.ResizeObserver = class {constructor() {throw new Error('fixture setup failure');}} as any;
    let failed = false;
    try {(window as any).create(scene);} catch {failed = true;}
    finally {window.ResizeObserver = observer; HTMLCanvasElement.prototype.getContext = original;}
    return {failed, count: contexts.length, released: contexts.every(context => context.isContextLost())};
  }, sample());
  expect(result).toEqual({failed: true, count: 1, released: true});
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('notebook model batch updates retain requested selection and resize cleanly', async ({page}) => {
  await page.goto('/tests/browser.html');
  await page.waitForFunction(() => (window as any).ready);
  await page.evaluate(async scene => {
    const {render} = await import('/dist/standalone/widget.js');
    const values: Record<string,any> = {scene, height: 500, selected_surface: 'wall'};
    const listeners = new Map<string,Set<() => void>>();
    const model = {
      get: (name: string) => values[name],
      set(name: string,value: any) {values[name] = value; for(const callback of listeners.get('change:'+name) ?? []) callback();},
      save_changes() {},
      on(name: string,callback: () => void) {if(!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name)!.add(callback);},
      off(name: string,callback: () => void) {listeners.get(name)?.delete(callback);}
    };
    const cleanup = render({model,el: document.getElementById('viewer')!});
    (window as any).widgetFixture = {model,values,listeners,cleanup,
      batch(changes: Record<string,any>) {Object.assign(values,changes); for(const key of Object.keys(changes)) for(const callback of listeners.get('change:'+key) ?? []) callback();}};
  }, sample());
  await expect(page.locator('#viewer #objects')).toHaveValue('wall');
  const next = sample(); next.objects[0].id = 'new-wall';
  await page.evaluate(scene => (window as any).widgetFixture.batch({scene,selected_surface:'new-wall'}),next);
  expect(await page.evaluate(() => (window as any).widgetFixture.values.selected_surface)).toBe('new-wall');
  await expect(page.locator('#viewer #objects')).toHaveValue('new-wall');
  await page.evaluate(() => (window as any).widgetFixture.model.set('height',450));
  await expect(page.locator('#viewer canvas')).toHaveCount(1);
  await expect(page.locator('#viewer #objects')).toHaveValue('new-wall');
  await page.evaluate(() => (window as any).widgetFixture.cleanup());
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => [...(window as any).widgetFixture.listeners.values()].every((callbacks: any) => callbacks.size === 0))).toBe(true);
});
