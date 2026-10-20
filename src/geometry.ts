// SPDX-License-Identifier: MIT
import {ShapeUtils, Vector2, Vector3} from 'three';
import type {RenderObject, RenderScene, Scene, SceneObject, Vec3} from './types.js';

function finiteRing(value: unknown, label: string): asserts value is Vec3[] {
  if (!Array.isArray(value) || value.length < 3 || value.some(p =>
    !Array.isArray(p) || p.length !== 3 || p.some(n => typeof n !== 'number' || !Number.isFinite(n)))) {
    throw new TypeError(`${label} must contain at least three finite metric triples`);
  }
}

/** Validate the portable scene envelope; never infer units or format versions. */
export function validateScene(value: unknown): asserts value is Scene {
  if (!value || typeof value !== 'object') throw new TypeError('Scene must be an object');
  const scene = value as Partial<Scene>;
  if (scene.schema !== 'epsm.scene/1') throw new TypeError('Unsupported scene schema');
  if (scene.units !== 'm' || scene.up_axis !== 'Z') throw new TypeError('Scene units must be m with Z up');
  if (!Array.isArray(scene.objects)) throw new TypeError('Scene objects must be an array');
  for (const key of ['report', 'diagnostics', 'internal_mass'] as const) {
    if (!scene[key] || typeof scene[key] !== 'object' || Array.isArray(scene[key])) {
      throw new TypeError(`Scene ${key} must be an object`);
    }
  }
  const identities = new Set<string>();
  for (const object of scene.objects) {
    if (typeof object.id !== 'string' || !object.id || identities.has(object.id)) {
      throw new TypeError('Scene object IDs must be nonempty and unique');
    }
    identities.add(object.id);
    if (typeof object.name !== 'string' || typeof object.kind !== 'string') {
      throw new TypeError('Scene object name and kind must be strings');
    }
    finiteRing(object.vertices, object.id);
    if (!Array.isArray(object.holes)) throw new TypeError('Scene holes must be an array');
    for (const hole of object.holes) finiteRing(hole, object.id + ' opening');
    if (!object.metadata || typeof object.metadata !== 'object' || Array.isArray(object.metadata)) {
      throw new TypeError('Scene object metadata must be an object');
    }
  }
  if (scene.preparation !== null) {
    if (!scene.preparation || typeof scene.preparation !== 'object') throw new TypeError('Scene preparation must be an object or null');
    for (const geometry of [scene.preparation.source_geometry, scene.preparation.cleaned_geometry]) {
      if (!geometry) continue;
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : null;
      if (!Array.isArray(polygons)) throw new TypeError('Preparation geometry must be Polygon or MultiPolygon');
      for (const polygon of polygons) {
        if (!Array.isArray(polygon)) throw new TypeError('Invalid preparation polygon');
        for (const ring of polygon) {
          if (!Array.isArray(ring) || ring.length < 3 || ring.some(point => !Array.isArray(point) || point.length !== 2 || point.some(n => typeof n !== 'number' || !Number.isFinite(n)))) {
            throw new TypeError('Preparation rings must contain finite metric pairs');
          }
        }
      }
    }
  }
}

const cross = (a: Vector2, b: Vector2, c: Vector2) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
function location(point: Vector2, ring: Vector2[], epsilon: number): -1 | 0 | 1 {
  let inside = false;
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const a=ring[j], b=ring[i];
    if (Math.abs(cross(a,b,point)) <= epsilon && point.x >= Math.min(a.x,b.x)-epsilon && point.x <= Math.max(a.x,b.x)+epsilon && point.y >= Math.min(a.y,b.y)-epsilon && point.y <= Math.max(a.y,b.y)+epsilon) return 0;
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside = !inside;
  }
  return inside ? 1 : -1;
}
function crossing(first: Vector2[], second: Vector2[], epsilon: number): boolean {
  for (let i=0; i<first.length; i++) for (let j=0; j<second.length; j++) {
    const a=first[i], b=first[(i+1)%first.length], c=second[j], d=second[(j+1)%second.length];
    if (cross(a,b,c)*cross(a,b,d) < -epsilon*epsilon && cross(c,d,a)*cross(c,d,b) < -epsilon*epsilon) return true;
  }
  return false;
}
function interior(ring: Vector2[]): Vector2 {
  const triangle = ShapeUtils.triangulateShape(ring.map(point => point.clone()), [])[0];
  if (!triangle) throw new TypeError('Degenerate opening ring');
  return triangle.reduce((sum,index) => sum.add(ring[index]), new Vector2()).divideScalar(3);
}

function triangulate(object: SceneObject): RenderObject {
  const unclosed = (ring: Vec3[]) => ring.length > 3 && ring[0].every((n,i) => n === ring.at(-1)![i]) ? ring.slice(0,-1) : ring;
  const rings = [object.vertices, ...object.holes].map(unclosed);
  const points = rings[0].map(v => new Vector3(...v));
  const origin = points[0];
  // Newell's normal also works when the first three polygon vertices are collinear.
  const normal = new Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i+1) % points.length];
    normal.x += (a.y-b.y)*(a.z+b.z);
    normal.y += (a.z-b.z)*(a.x+b.x);
    normal.z += (a.x-b.x)*(a.y+b.y);
  }
  if (normal.length() < 1e-12) throw new TypeError(`Degenerate polygon ${object.id}`);
  normal.normalize();
  const u = points.find(p => p.distanceTo(origin) > 1e-12)!.clone().sub(origin).normalize();
  const v = new Vector3().crossVectors(normal, u).normalize();
  const extent = Math.max(...points.map(p => p.distanceTo(origin)), 1);
  const projected = rings.map(ring => ring.map(tuple => {
    const delta = new Vector3(...tuple).sub(origin);
    if (Math.abs(delta.dot(normal)) > extent * 1e-8) {
      throw new TypeError(`Polygon ${object.id} must be planar`);
    }
    return new Vector2(delta.dot(u), delta.dot(v));
  }));
  const epsilon = extent*extent*1e-10;
  for (const [i,hole] of projected.slice(1).entries()) {
    if (hole.some(point => location(point,projected[0],epsilon) < 0) || crossing(hole,projected[0],epsilon)) {
      throw new TypeError(`Opening lies outside polygon ${object.id}`);
    }
    for (const other of projected.slice(1,i+1)) {
      if (crossing(hole,other,epsilon) || hole.some(point => location(point,other,epsilon) === 1) || other.some(point => location(point,hole,epsilon) === 1) || location(interior(hole),other,epsilon) === 1 || location(interior(other),hole,epsilon) === 1) {
        throw new TypeError(`Opening rings overlap in polygon ${object.id}`);
      }
    }
  }
  const expected = Math.abs(ShapeUtils.area(projected[0]))-projected.slice(1).reduce((sum,ring) => sum+Math.abs(ShapeUtils.area(ring)),0);
  const allPoints = rings.flat();
  const indices = ShapeUtils.triangulateShape(projected[0], projected.slice(1));
  if (!indices.length && expected > epsilon) throw new TypeError(`Cannot triangulate polygon ${object.id}`);
  const triangles = indices.flatMap(face => face.flatMap(index => allPoints[index]));
  let actual = 0;
  for (let i=0; i<triangles.length; i+=9) {
    const a=new Vector3(...triangles.slice(i,i+3)), b=new Vector3(...triangles.slice(i+3,i+6)), c=new Vector3(...triangles.slice(i+6,i+9));
    actual += new Vector3().crossVectors(b.sub(a),c.sub(a)).length()/2;
  }
  const tolerance = Math.max(1e-8, extent*extent*1e-8);
  if (Math.abs(actual-expected) > tolerance || (object.net_area_m2 !== undefined && Math.abs(actual-object.net_area_m2) > tolerance)) {
    throw new TypeError(`Drawing area does not match opening coverage for ${object.id}`);
  }
  return {...object, triangles, normal: normal.toArray() as Vec3,
    epjson: object.epjson ?? {}, construction_report: object.construction_report ?? {}};
}

/** Prepare drawing triangles without changing the producer's polygons or metadata. */
export function prepareScene(value: unknown): RenderScene {
  validateScene(value);
  const scene = structuredClone(value);
  const objects = scene.objects.map(triangulate);
  for (const mass of scene.report.internal_mass ?? []) {
    for (const [index, vertices] of mass.vertices.entries()) {
      objects.push(triangulate({id: `${mass.name}_visual_${index}`, name: `${mass.name}_visual_${index}`,
        kind: 'slab_visual', vertices, holes: [], zone: mass.zone,
        metadata: {representation: 'visualization of InternalMass; not a thermal boundary',
          storey: (mass.storey ?? 0) + 1, part_id: mass.part_id},
        epjson: {surface_type: 'Floor'}}));
    }
  }
  return {...scene, objects};
}
