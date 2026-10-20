// SPDX-License-Identifier: MIT
/** Plain metric scene values. Physical interpretation belongs to the producer. */
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export interface SceneMetadata extends Record<string, unknown> {
  storey?: number;
  surface_type?: string;
  zone_kind?: string;
  annotations?: string[];
}
export interface SceneObject {
  id: string;
  name: string;
  kind: string;
  vertices: Vec3[];
  holes: Vec3[][];
  metadata: SceneMetadata;
  normal?: Vec3;
  parent?: string | null;
  area_m2?: number;
  net_area_m2?: number;
  boundary?: string | null;
  zone?: string | null;
  construction_name?: string;
  layers?: Record<string, unknown>[];
  construction_report?: Record<string, unknown>;
  epjson?: {surface_type?: string; [key: string]: unknown};
}
export interface FootprintGeometry {
  type: string;
  coordinates: Vec2[][] | Vec2[][][];
}
export interface Preparation {
  source_geometry?: FootprintGeometry;
  cleaned_geometry?: FootprintGeometry;
  edge_lineage?: {changed?: boolean; start: Vec2; end: Vec2}[];
}
export interface SceneReport extends Record<string, unknown> {
  geometry_only?: boolean;
  origin_m?: Vec2;
  orientation_deg?: number;
  internal_mass?: {
    name: string; zone: string; part_id: string; storey?: number; vertices: Vec3[][];
  }[];
}
export interface Scene {
  schema: 'epsm.scene/1';
  units: 'm';
  up_axis: 'Z';
  objects: SceneObject[];
  report: SceneReport;
  diagnostics: Record<string, unknown>;
  preparation: Preparation | null;
  internal_mass: Record<string, unknown>;
  [key: string]: unknown;
}
export interface RenderObject extends SceneObject {
  triangles: number[];
  normal: Vec3;
  construction_report: Record<string, unknown>;
  epjson: {surface_type?: string; [key: string]: unknown};
}
export interface RenderScene extends Scene {objects: RenderObject[]}
export interface Selection {
  objectId: string;
  name: string;
  kind: string;
  metadata: Readonly<SceneMetadata>;
}
export interface ViewerOptions {
  onSelect?: (selection: Selection | null) => void;
  /** CSS height of the embedded viewer. Default: 600px. */
  height?: string;
}
export interface ViewerHandle {
  setScene(scene: Scene): void;
  setSelection(objectId: string | null): void;
  fit(includeContext?: boolean): void;
  dispose(): void;
}
