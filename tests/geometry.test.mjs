// SPDX-License-Identifier: MIT
// Extracted EPSM viewer regression tests; fixtures are synthetic metric geometry.
import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareScene, validateScene } from '../dist/geometry.js';

const scene = objects => ({schema: 'epsm.scene/1', units: 'm', up_axis: 'Z', objects,
  report: {}, diagnostics: {}, preparation: null, internal_mass: {}});
const surface = (vertices, extra = {}) => ({id: 'wall-1', name: 'wall-1', kind: 'surface',
  vertices, holes: [], metadata: {}, ...extra});
function area(flat) {
  let sum = 0;
  for (let i = 0; i < flat.length; i += 9) {
    const a = flat.slice(i, i+3), b = flat.slice(i+3, i+6), c = flat.slice(i+6, i+9);
    const u = b.map((v,j) => v-a[j]), v = c.map((x,j) => x-a[j]);
    sum += Math.hypot(u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])/2;
  }
  return sum;
}
test('opaque wall excludes its opening and retains caller identities without mutation', () => {
  const input = scene([surface([[0,0,0],[8,0,0],[8,0,3],[0,0,3]], {
    holes: [[[2,0,1],[4,0,1],[4,0,2],[2,0,2]]],
    metadata: {physical_element_id: 'physical-wall-7', source: '<script>text</script>'}
  })]);
  const before = structuredClone(input);
  const output = prepareScene(input);
  assert.ok(Math.abs(area(output.objects[0].triangles)-22) < 1e-9);
  assert.equal(output.objects[0].metadata.physical_element_id, 'physical-wall-7');
  assert.deepEqual(input, before);
});
test('concave polygons and courtyard holes retain their independent expected areas', () => {
  const output = prepareScene(scene([
    surface([[0,0,0],[4,0,0],[4,1,0],[1,1,0],[1,4,0],[0,4,0]]),
    surface([[0,0,3],[10,0,3],[10,10,3],[0,10,3]], {
      id: 'context-roof', name: 'context-roof', kind: 'context',
      holes: [[[2,2,3],[8,2,3],[8,8,3],[2,8,3]]]
    })
  ]));
  assert.ok(Math.abs(area(output.objects[0].triangles)-7) < 1e-9);
  assert.ok(Math.abs(area(output.objects[1].triangles)-64) < 1e-9);
});
test('empty scenes are valid drafts; unsupported versions, units and invalid coordinates fail', () => {
  assert.equal(prepareScene(scene([])).objects.length, 0);
  assert.throws(() => validateScene({...scene([]), schema: 'epsm.scene/99'}), /schema/i);
  assert.throws(() => validateScene({...scene([]), units: 'mm'}), /units/i);
  assert.throws(() => prepareScene(scene([surface([[0,0,0],[1,0,0],[0,NaN,0]])])), /finite/i);
  assert.throws(() => prepareScene(scene([surface([[0,0,0],[1,0,0],[2,0,0]])])), /degenerate/i);
  assert.throws(() => prepareScene(scene([surface([[0,0,0],[1,0,0],[1,1,1],[0,1,0]])])), /planar/i);
});
test('reversed polygon winding preserves area and shading context remains complete', () => {
  const object = surface([[0,0,0],[0,0,3],[8,0,3],[8,0,0]], {kind: 'context'});
  const result = prepareScene(scene([object]));
  assert.ok(Math.abs(area(result.objects[0].triangles)-24) < 1e-9);
  assert.equal(result.objects[0].kind, 'context');
});
test('internal mass visual slabs are marked separately from thermal surfaces', () => {
  const input = scene([]);
  input.report.internal_mass = [{name: 'mass', zone: 'z1', part_id: 'p1', storey: 0,
    vertices: [[[0,0,2],[2,0,2],[2,3,2],[0,3,2]]]}];
  const output = prepareScene(input);
  assert.equal(output.objects[0].kind, 'slab_visual');
  assert.match(output.objects[0].metadata.representation, /not a thermal boundary/);
  assert.equal(area(output.objects[0].triangles), 6);
});
test('overlapping or outside opening coverage is rejected instead of drawing a false net area', () => {
  const outer = [[0,0,0],[10,0,0],[10,10,0],[0,10,0]];
  const ring = (x,y,w,h) => [[x,y,0],[x+w,y,0],[x+w,y+h,0],[x,y+h,0]];
  assert.throws(() => prepareScene(scene([surface(outer, {
    holes: [ring(1,1,4,4), ring(3,3,4,4)]
  })])), /overlap/i);
  assert.throws(() => prepareScene(scene([surface(outer, {
    holes: [ring(-2,1,5,3)]
  })])), /outside/i);
});
test('closed rings and independent producer net-area evidence are respected', () => {
  const outer = [[0,0,0],[10,0,0],[10,10,0],[0,10,0],[0,0,0]];
  const holes = [[[2,2,0],[8,2,0],[8,8,0],[2,8,0],[2,2,0]]];
  const output = prepareScene(scene([surface(outer, {holes, net_area_m2: 64})]));
  assert.ok(Math.abs(area(output.objects[0].triangles)-64) < 1e-9);
  assert.throws(() => prepareScene(scene([surface(outer, {holes, net_area_m2: 99})])), /area/i);
});
