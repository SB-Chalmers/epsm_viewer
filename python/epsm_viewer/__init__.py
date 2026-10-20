# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
"""Explicit browser and notebook display for loaded neutral EPSM scenes.

Importing this package reads no files, configures no logging, launches no
browser and imports neither Core nor optional notebook dependencies.
"""

from .io import ViewerHandle, view_scene, write_scene
from .notebook import scene_widget

__all__ = ["ViewerHandle", "view_scene", "write_scene", "scene_widget"]
