# File: scene.py
# Purpose: Validate the neutral scene transport boundary without physical algorithms.
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
# License: MIT; see the project-root LICENSE.
# Date created: 2026-10-20
# Date modified: 2026-10-20
"""Pure transport checks; scene production and physical meaning stay upstream."""

import json


def validate_scene(scene):
    """Return detached finite JSON scene values accepted by the display runtime.

    The supported envelope is ``epsm.scene/1``, metres and Z-up coordinates.
    Polygon coordinates must be numeric XYZ triples. This checks transport
    shape only, without choosing physical assumptions or converting epJSON.
    No files, services or rendering dependencies are accessed.
    """
    if not isinstance(scene, dict):
        raise TypeError("Supply a loaded epsm.scene/1 dictionary")
    for name, expected in (("schema", "epsm.scene/1"), ("units", "m"), ("up_axis", "Z")):
        if scene.get(name) != expected:
            raise ValueError(f"Scene {name} must be {expected!r}")
    for name in ("report", "diagnostics", "internal_mass"):
        if not isinstance(scene.get(name), dict):
            raise ValueError(f"Scene {name} must be an object")
    if "preparation" not in scene or not isinstance(scene["preparation"], (dict, type(None))):
        raise ValueError("Scene preparation must be an object or null")
    if not isinstance(scene.get("objects"), list):
        raise ValueError("Scene objects must be an array")
    # JSON normalization rejects NaN/infinity anywhere, including source metadata,
    # and detaches nested state shared by otherwise independent notebook views.
    data = json.loads(json.dumps(scene, allow_nan=False))
    identifiers = set()
    for obj in data["objects"]:
        if not isinstance(obj, dict):
            raise ValueError("Each scene object must be an object")
        for name in ("id", "name", "kind"):
            if not isinstance(obj.get(name), str):
                raise ValueError(f"Scene object {name} must be a string")
        if not obj["id"]:
            raise ValueError("Scene object ID must be nonempty")
        if obj["id"] in identifiers:
            raise ValueError(f"Duplicate scene object ID: {obj['id']}")
        identifiers.add(obj["id"])
        if not isinstance(obj.get("metadata"), dict):
            raise ValueError("Scene object metadata must be an object")
        _polygon(obj.get("vertices"))
        if not isinstance(obj.get("holes"), list):
            raise ValueError("Scene object holes must be an array")
        for hole in obj["holes"]:
            _polygon(hole)
    if data["preparation"] is not None:
        for name in ("source_geometry", "cleaned_geometry"):
            geometry = data["preparation"].get(name)
            if geometry is not None:
                _preparation_geometry(geometry)
    return data


def _preparation_geometry(geometry):
    """Check supported two-dimensional overlay transport while retaining evidence."""
    if not isinstance(geometry, dict) or geometry.get("type") not in ("Polygon", "MultiPolygon"):
        raise ValueError("Preparation geometry must be Polygon or MultiPolygon")
    coordinates = geometry.get("coordinates")
    if not isinstance(coordinates, list):
        raise ValueError("Preparation coordinates must be an array")
    polygons = [coordinates] if geometry["type"] == "Polygon" else coordinates
    for polygon in polygons:
        if not isinstance(polygon, list):
            raise ValueError("Preparation polygon must be an array of rings")
        for ring in polygon:
            if (
                not isinstance(ring, list)
                or len(ring) < 3
                or any(
                    not isinstance(point, list)
                    or len(point) != 2
                    or any(
                        isinstance(value, bool) or not isinstance(value, (int, float))
                        for value in point
                    )
                    for point in ring
                )
            ):
                raise ValueError(
                    "Preparation rings must contain at least three finite metric pairs"
                )


def _polygon(points):
    """Check only the numeric polygon transport shape, without geometry repair."""
    if not isinstance(points, list) or len(points) < 3:
        raise ValueError("Scene polygons require at least three XYZ vertices")
    for point in points:
        if (
            not isinstance(point, list)
            or len(point) != 3
            or any(
                isinstance(value, bool) or not isinstance(value, (int, float)) for value in point
            )
        ):
            raise ValueError("Scene vertices must be numeric XYZ triples")
