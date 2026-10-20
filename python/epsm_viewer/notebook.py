# File: notebook.py
# Purpose: Lazy optional notebook display for loaded neutral polygon scenes.
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
# License: MIT; see the project-root LICENSE.
# Author: Sanjay Somanath <sanjay.somanath@chalmers.se>
# Computational Sustainable Design Group, Chalmers University of Technology
# Date created: 2026-10-20 (extracted from Core notebook.py; attribution retained)
# Date modified: 2026-10-20
"""Optional widget display; no notebook dependency or asset read occurs on import."""

from pathlib import Path

from .scene import validate_scene


def _widget_type():
    """Load optional notebook dependencies only when display is requested."""
    try:
        import anywidget
        import traitlets
    except ImportError as error:
        raise ImportError("Install epsm_viewer[notebook] to display embedded 3D scenes") from error

    class SceneWidget(anywidget.AnyWidget):
        """Independent widget state; selection is synchronized with its frontend."""

        _esm = Path(__file__).with_name("assets") / "widget.js"
        scene = traitlets.Dict().tag(sync=True)
        height = traitlets.Int(600, min=200, max=4000).tag(sync=True)
        selected_surface = traitlets.Unicode("").tag(sync=True)

        @traitlets.validate("scene")
        def _validate_scene(self, proposal):
            return validate_scene(proposal["value"])

    return SceneWidget


def scene_widget(scene, *, height=600):
    """Display a loaded scene in an independent optional notebook widget.

    Parameters
    ----------
    scene : dict
        Loaded finite ``epsm.scene/1`` values. Nested values are detached so
        changing the caller's dictionary does not mutate the widget's scene.
    height : int, optional
        Display height in CSS pixels, from 200 to 4000; default 600.

    Returns
    -------
    anywidget.AnyWidget
        Scene, height and selected_surface traits are synchronized with the
        frontend. Close the widget to release frontend resources.

    Raises
    ------
    ImportError
        Optional dependencies are missing; install ``epsm_viewer[notebook]``.
    ValueError, TypeError
        The scene is malformed/nonfinite or height is outside the supported range.

    Notes
    -----
    Reads the packaged widget asset on this explicit call. No output files,
    server, engine, browser launch or Core import is needed. The scene travels
    through the notebook kernel and the frontend requires no CDN download.

    Examples
    --------
    With the notebook extra installed and an already loaded ``scene``::

        widget = scene_widget(scene, height=500)
        display(widget)
        widget.close()
    """
    data = validate_scene(scene)
    if isinstance(height, bool) or not isinstance(height, int) or not 200 <= height <= 4000:
        raise ValueError("Widget height must be an integer from 200 to 4000 CSS pixels")
    return _widget_type()(scene=data, height=height)
