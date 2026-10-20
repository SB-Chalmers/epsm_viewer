# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
"""Build Python distributions from explicitly prepared, version-matched JS assets.

The npm build prepares browser/widget resources. This backend never runs Node,
including when rebuilding a wheel from a clean Python source distribution.
"""

import json
from pathlib import Path

from setuptools import build_meta

ASSETS = (
    "browser.js",
    "widget.js",
    "index.html",
    "LICENSE",
    "THREE_LICENSE",
    "THIRD_PARTY_NOTICES.md",
)


def validate_package(root=None):
    """Check release version and bundled resources without generating or fetching them."""
    root = Path(root) if root is not None else Path(__file__).resolve().parent
    version = (root / "VERSION").read_text(encoding="utf-8").strip()
    package_version = json.loads((root / "package.json").read_text(encoding="utf-8"))["version"]
    if not version or version != package_version:
        raise ValueError("VERSION must match package.json; update both deliberately")
    assets = root / "python/epsm_viewer/assets"
    missing = [
        name
        for name in ASSETS
        if not (assets / name).is_file() or not (assets / name).stat().st_size
    ]
    if missing:
        raise ValueError(
            "Prepared Viewer resources missing: "
            + ", ".join(missing)
            + ". Run npm ci and npm run build before creating Python distributions. "
            "A released Python sdist must already contain these resources."
        )
    return version


def get_requires_for_build_wheel(config_settings=None):
    validate_package()
    return build_meta.get_requires_for_build_wheel(config_settings)


def get_requires_for_build_sdist(config_settings=None):
    validate_package()
    return build_meta.get_requires_for_build_sdist(config_settings)


def prepare_metadata_for_build_wheel(metadata_directory, config_settings=None):
    validate_package()
    return build_meta.prepare_metadata_for_build_wheel(metadata_directory, config_settings)


def build_wheel(wheel_directory, config_settings=None, metadata_directory=None):
    validate_package()
    return build_meta.build_wheel(wheel_directory, config_settings, metadata_directory)


def build_sdist(sdist_directory, config_settings=None):
    validate_package()
    return build_meta.build_sdist(sdist_directory, config_settings)


def get_requires_for_build_editable(config_settings=None):
    validate_package()
    return build_meta.get_requires_for_build_editable(config_settings)


def prepare_metadata_for_build_editable(metadata_directory, config_settings=None):
    validate_package()
    return build_meta.prepare_metadata_for_build_editable(metadata_directory, config_settings)


def build_editable(wheel_directory, config_settings=None, metadata_directory=None):
    validate_package()
    return build_meta.build_editable(wheel_directory, config_settings, metadata_directory)
