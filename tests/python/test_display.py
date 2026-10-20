"""Public display operations consume neutral scenes without importing Core."""

import builtins
import json
import socket
import subprocess
import sys
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest
from epsm_viewer import scene_widget, view_scene, write_scene


def scene():
    return dict(
        schema="epsm.scene/1",
        units="m",
        up_axis="Z",
        objects=[],
        report={},
        diagnostics={},
        preparation=None,
        internal_mass={},
    )


def test_import_has_no_core_or_notebook_dependency():
    subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; import epsm_viewer; "
            "assert 'epsm_core' not in sys.modules; "
            "assert 'anywidget' not in sys.modules",
        ],
        check=True,
    )


def test_write_bundle_preserves_scene_and_refuses_existing_evidence(tmp_path):
    directory = write_scene(scene(), directory=tmp_path / "preview")
    assert json.loads((directory / "model.json").read_text()) == scene()
    assert (directory / "browser.js").is_file()
    assert (directory / "index.html").is_file()
    with pytest.raises(FileExistsError):
        write_scene(scene(), directory=directory)
    with pytest.raises(ValueError):
        write_scene({**scene(), "schema": "future"}, directory=tmp_path / "invalid")
    assert not (tmp_path / "invalid").exists()


def test_loopback_server_serves_only_snapshot_and_closes(tmp_path):
    directory = tmp_path / "preview"
    with view_scene(scene(), directory=directory, launch_browser=False) as handle:
        assert urlopen(handle.url).status == 200
        assert json.load(urlopen(handle.url + "model.json")) == scene()
        (directory / "private.txt").write_text("private")
        (directory / "model.json").write_text("changed after snapshot")
        assert json.load(urlopen(handle.url + "model.json")) == scene()
        for suffix in ("private.txt", "../model.json", "%2e%2e/private.txt"):
            with pytest.raises(HTTPError):
                urlopen(handle.url + suffix)
        port = handle._server.server_port
    with socket.socket() as client:
        assert client.connect_ex(("127.0.0.1", port)) != 0
    handle.close()  # Idempotent cleanup.


def test_notebook_dependency_error_is_actionable(monkeypatch):
    original = builtins.__import__

    def missing(name, *args, **kwargs):
        if name == "anywidget":
            raise ImportError("missing")
        return original(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", missing)
    with pytest.raises(ImportError, match=r"epsm_viewer\[notebook\]"):
        scene_widget(scene())
