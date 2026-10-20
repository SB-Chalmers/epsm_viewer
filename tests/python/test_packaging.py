# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
"""Build preparation rejects mismatched versions and missing bundled resources."""

import importlib.util
import json
from importlib import metadata, resources
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
ASSETS = (
    "browser.js",
    "widget.js",
    "index.html",
    "LICENSE",
    "THREE_LICENSE",
    "THIRD_PARTY_NOTICES.md",
)


def backend():
    spec = importlib.util.spec_from_file_location("viewer_build_backend", ROOT / "build_backend.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def prepared_source(tmp_path):
    (tmp_path / "VERSION").write_text("0.1.0\n")
    (tmp_path / "package.json").write_text(json.dumps({"version": "0.1.0"}))
    assets = tmp_path / "python/epsm_viewer/assets"
    assets.mkdir(parents=True)
    for name in ASSETS:
        (assets / name).write_text(f"Fixture {name}\n")
    return tmp_path


def test_prepared_python_source_needs_no_node_process(prepared_source, monkeypatch):
    def unexpected_process(*args, **kwargs):
        raise AssertionError("Python packaging must not invoke Node")

    import subprocess

    monkeypatch.setattr(subprocess, "run", unexpected_process)
    assert backend().validate_package(prepared_source) == "0.1.0"


def test_python_build_rejects_mismatched_version_without_rewriting_it(prepared_source):
    version = prepared_source / "VERSION"
    version.write_text("0.2.0\n")
    with pytest.raises(ValueError, match="VERSION.*package.json|package.json.*VERSION"):
        backend().validate_package(prepared_source)
    assert version.read_text() == "0.2.0\n"


@pytest.mark.parametrize("name", ASSETS)
def test_python_build_requires_every_display_asset_and_notice(prepared_source, name):
    (prepared_source / "python/epsm_viewer/assets" / name).unlink()
    with pytest.raises(ValueError, match="npm run build"):
        backend().validate_package(prepared_source)


def test_installed_version_resources_and_licenses():
    assert metadata.version("epsm_viewer") == (ROOT / "VERSION").read_text().strip()
    assets = resources.files("epsm_viewer") / "assets"
    for name in ASSETS:
        assert (assets / name).read_bytes(), name
    assert "Permission is hereby granted" in (assets / "THREE_LICENSE").read_text()
    assert "MIT" in (assets / "THIRD_PARTY_NOTICES.md").read_text()
