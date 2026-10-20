// SPDX-License-Identifier: MIT
import {mountViewer} from './index.js';
import type {Scene} from './types.js';

interface WidgetModel {
  get(name: 'scene'): Scene;
  get(name: 'height'): number;
  get(name: 'selected_surface'): string;
  set(name: string, value: unknown): void;
  save_changes(): void;
  on(name: string, callback: () => void): void;
  off(name: string, callback: () => void): void;
}
/** Anywidget frontend; the scene travels through the kernel, without a local server. */
export function render({model, el}: {model: WidgetModel; el: HTMLElement}) {
  let applyingModel = false;
  const onSelect = (selection: import('./types.js').Selection | null) => {
    const id = selection?.objectId ?? '';
    if (!applyingModel && model.get('selected_surface') !== id) {
      model.set('selected_surface', id);
      model.save_changes();
    }
  };
  let viewer = mountViewer(el, model.get('scene'), {
    height: `${model.get('height')}px`,
    onSelect
  });
  const select = () => {
    applyingModel = true;
    try {viewer.setSelection(model.get('selected_surface') || null);}
    catch (error) {
      if (!(error instanceof RangeError)) throw error;
      viewer.setSelection(null);
    }
    finally {applyingModel = false;}
  };
  const draw = () => {
    applyingModel = true;
    try {viewer.setScene(model.get('scene'));}
    finally {applyingModel = false;}
    select();
  };
  const resize = () => {
    viewer.dispose();
    viewer = mountViewer(el, model.get('scene'), {
      height: `${model.get('height')}px`,
      onSelect
    });
    select();
  };
  select();
  model.on('change:scene', draw);
  model.on('change:height', resize);
  model.on('change:selected_surface', select);
  return () => {
    model.off('change:scene', draw);
    model.off('change:height', resize);
    model.off('change:selected_surface', select);
    viewer.dispose();
  };
}
