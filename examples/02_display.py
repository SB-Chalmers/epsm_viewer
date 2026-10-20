# SPDX-License-Identifier: MIT
"""Write a synthetic metric scene without Core, a database or an engine."""
import argparse

from epsm_viewer import write_scene


def example_scene():
    """Return one named teaching wall, 4 m by 3 m, with no source-data claim."""
    return {
        "schema": "epsm.scene/1", "units": "m", "up_axis": "Z",
        "objects": [{"id": "wall", "name": "Teaching wall", "kind": "surface",
                     "vertices": [[0, 0, 0], [4, 0, 0], [4, 0, 3], [0, 0, 3]],
                     "holes": [], "metadata": {"source": "synthetic example"}}],
        "report": {"geometry_only": True}, "diagnostics": {},
        "preparation": None, "internal_mass": {},
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", help="New output directory; existing paths are refused")
    args = parser.parse_args()
    print(write_scene(example_scene(), args.directory))
