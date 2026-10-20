// SPDX-License-Identifier: MIT
import {prepareScene} from './geometry.js';
import {mountRenderer} from './renderer.js';
import {template} from './template.js';
import type {RenderObject, Scene, Selection, ViewerHandle, ViewerOptions} from './types.js';
export {prepareScene, validateScene} from './geometry.js';
export type {Scene, SceneObject, Selection, ViewerHandle, ViewerOptions, Vec3} from './types.js';

/**
 * Embed a metric scene in an isolated DOM root. No fetch, simulation or saving occurs.
 * The caller owns the container and must call dispose when it is removed.
 *
 * @example
 * const viewer = mountViewer(container, scene, {onSelect: selection => inspect(selection)});
 * viewer.setScene(updatedScene);
 * viewer.dispose();
 */
export function mountViewer(container: HTMLElement, scene: Scene, options: ViewerOptions = {}): ViewerHandle {
  const host = document.createElement('div');
  host.style.cssText = `display:block;width:100%;min-width:0;height:${options.height ?? '600px'}`;
  container.appendChild(host);
  const root = host.attachShadow({mode: 'open'});
  let active: ReturnType<typeof mountRenderer> | undefined;
  let disposed = false;
  let selected: string | null = null;
  let current = scene;
  let displayed: RenderObject[] = [];
  const onSelect = (objectId: string) => {
    selected = objectId;
    const object = displayed.find(item => item.id === objectId);
    const selection: Selection | null = object ? {objectId, name: object.name, kind: object.kind,
      metadata: structuredClone(object.metadata)} : null;
    options.onSelect?.(selection);
  };
  const ensureActive = () => {if (disposed) throw new Error('Viewer has been disposed');};
  const draw = (value: Scene) => {
    const prepared = prepareScene(value); // Invalid updates leave the current scene intact.
    active?.dispose();
    current = structuredClone(value);
    displayed = prepared.objects;
    root.innerHTML = template;
    active = mountRenderer(root, prepared, onSelect);
    if (selected !== null) {
      if (displayed.some(object => object.id === selected)) active.select(selected);
      else {selected = null; options.onSelect?.(null);}
    }
  };
  try {draw(scene);} catch (error) {active?.dispose(); host.remove(); throw error;}
  return {
    setScene(value) {ensureActive(); draw(value);},
    setSelection(id) {
      ensureActive();
      if (id !== null && !displayed.some(object => object.id === id)) {
        throw new RangeError(`Unknown scene object ${id}`);
      }
      selected = id;
      active!.select(id);
      if (id === null) options.onSelect?.(null);
    },
    fit(includeContext = false) {ensureActive(); active!.fit(includeContext);},
    dispose() {
      if (disposed) return;
      disposed = true;
      active?.dispose();
      host.remove();
    }
  };
}
