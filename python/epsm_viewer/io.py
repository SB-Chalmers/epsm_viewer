# File: io.py
# Purpose: Explicit bundle writing and tokenized loopback display for loaded scenes.
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Sanjay Somanath
# License: MIT; see the project-root LICENSE.
# Author: Sanjay Somanath <sanjay.somanath@chalmers.se>
# Project PI: Alexander Hollberg
# Computational Sustainable Design Group, Chalmers University of Technology
# Date created: 2026-10-20 (extracted from Core viewer.py; attribution retained)
# Date modified: 2026-10-20
# Changelog:
#   2026-10-20 - Display neutral scenes with explicit writes and owned server lifecycle.
"""Display I/O with complete files, refused overwrite and immutable serving snapshots.

Directory publication is not a transaction. A newly claimed output directory
receives complete staged files through atomic links; index.html is published
last as its completion marker. On failure only files created by this operation
are removed. The loopback server starts after the bundle has completed.
"""

import json
import logging
import mimetypes
import os
import secrets
import shutil
import tempfile
import webbrowser
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from .scene import validate_scene

logger = logging.getLogger(__name__)
_ASSET_NAMES = (
    "browser.js",
    "widget.js",
    "LICENSE",
    "THREE_LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "index.html",
)


def _bundle_bytes(scene):
    """Validate loaded values, then read only the packaged offline display assets."""
    data = validate_scene(scene)
    assets = Path(__file__).with_name("assets")
    bundle = {"model.json": json.dumps(data, allow_nan=False).encode("utf-8")}
    for name in _ASSET_NAMES:
        path = assets / name
        if not path.is_file() or path.is_symlink():
            raise FileNotFoundError(
                f"Packaged viewer asset unavailable: {name}; rebuild epsm_viewer assets"
            )
        bundle[name] = path.read_bytes()
    return bundle


def _publish_directory(staging, directory):
    """Claim a new directory and atomically publish complete files, index last."""
    directory.mkdir()
    created = []
    try:
        sources = sorted(staging.iterdir(), key=lambda path: path.name == "index.html")
        for source in sources:
            target = directory / source.name
            # Both locations share a filesystem. Linking a complete staged file
            # refuses a concurrently created target instead of replacing it.
            os.link(source, target)
            created.append(target)
    except BaseException:
        for target in reversed(created):
            target.unlink(missing_ok=True)
        try:
            directory.rmdir()
        except OSError:
            # Another writer's files are never recursively removed.
            pass
        raise


def _write_bundle(bundle, directory):
    """Stage bytes beside an explicitly chosen destination and preserve failures."""
    directory = Path(directory).absolute()
    if directory.exists() or directory.is_symlink():
        raise FileExistsError(f"Viewer output directory already exists: {directory}")
    directory.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{directory.name}-", dir=directory.parent))
    try:
        for name, content in bundle.items():
            (staging / name).write_bytes(content)
        _publish_directory(staging, directory)
    finally:
        shutil.rmtree(staging)
    logger.info(
        "Viewer bundle written",
        extra={
            "epsm_event": "viewer.bundle.write.completed",
            "epsm_context": {},
            "epsm_details": {"directory": str(directory), "files": len(bundle)},
        },
    )
    return directory


def write_scene(scene, directory):
    """Write a complete offline browser bundle for a loaded neutral scene.

    Parameters
    ----------
    scene : dict
        Finite JSON values in the ``epsm.scene/1`` format, metres and Z-up axes.
    directory : str or Path
        New output directory, relative to the caller's working directory if
        relative. Missing parent directories are created after input validation.

    Returns
    -------
    Path
        Absolute directory containing model.json, index.html and bundled assets.

    Raises
    ------
    FileExistsError
        The destination already exists, including an empty directory or symlink.
    ValueError, TypeError
        Scene values are malformed, unsupported or nonfinite.
    OSError
        Packaged assets cannot be read or complete files cannot be published.

    Notes
    -----
    Existing output is never overwritten. Each file is staged completely before
    atomic publication, with index.html last as the completion marker. A bundle
    is not a filesystem transaction. Failure removes this operation's new files;
    it never recursively removes unrelated destination contents. No server or
    browser is started. Generated artifacts persist until the caller removes them.

    Examples
    --------
    For an already loaded ``scene`` and a new output directory::

        directory = write_scene(scene, "output/inspection")
        assert (directory / "model.json").is_file()
    """
    return _write_bundle(_bundle_bytes(scene), directory)


@dataclass(repr=False)
class ViewerHandle:
    """Owned loopback server and generated artifacts, with explicit cleanup.

    ``close()`` releases the server, socket and thread. Artifacts remain on disk.
    Context management closes the handle after success or an exception. Printing
    the handle performs no I/O. The URL works only while the handle is running.
    """

    url: str
    directory: Path
    _server: object = field(repr=False)
    _thread: object = field(repr=False)
    _closed: bool = field(default=False, init=False, repr=False)

    def close(self):
        """Idempotently release server resources while retaining generated files."""
        if self._closed:
            return
        self._server.shutdown()
        self._server.server_close()
        self._thread.join(timeout=5)
        self._closed = True
        logger.debug(
            "Viewer server closed",
            extra={
                "epsm_event": "viewer.server.closed",
                "epsm_context": {},
                "epsm_details": {"directory": str(self.directory)},
            },
        )

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    def __str__(self):
        return self.url

    def __repr__(self):
        return f"ViewerHandle(directory={str(self.directory)!r}, running={not self._closed})"


def view_scene(scene, directory=None, *, launch_browser=True):
    """Write and serve a fixed scene bundle on a tokenized loopback URL.

    Parameters
    ----------
    scene : dict
        Loaded finite ``epsm.scene/1`` values; no Core model or epJSON conversion.
    directory : str or Path or None, optional
        New artifact directory. None creates a temporary root with a new
        ``preview`` child. Existing destinations are refused. Files are retained.
    launch_browser : bool, optional
        Open the system browser after the server is ready; default True.

    Returns
    -------
    ViewerHandle
        Context-managed owner. Call close or use a with block to release its socket.

    Notes
    -----
    Binds only 127.0.0.1 on an ephemeral port. The server serves an in-memory
    allowlist captured before publication; later edits and source siblings are
    inaccessible. Unknown paths return 404, including traversal attempts. It
    starts only after complete bundle publication. No network download occurs.

    Examples
    --------
    For an already loaded neutral scene::

        with view_scene(scene, launch_browser=False) as handle:
            print(handle.url)
    """
    bundle = _bundle_bytes(scene)
    if directory is None:
        directory = Path(tempfile.mkdtemp(prefix="epsm-viewer-")) / "preview"
    directory = _write_bundle(bundle, directory)
    token = secrets.token_urlsafe(24)

    class Handler(BaseHTTPRequestHandler):
        """Serve only token-prefixed immutable bytes, without filesystem lookup."""

        def do_GET(self):
            path = urlsplit(self.path).path
            prefix = "/" + token + "/"
            filename = (path[len(prefix) :] or "index.html") if path.startswith(prefix) else None
            if filename not in bundle:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header(
                "Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream"
            )
            self.send_header("Content-Length", str(len(bundle[filename])))
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(bundle[filename])

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    try:
        thread.start()
    except BaseException:
        server.server_close()
        raise
    handle = ViewerHandle(
        f"http://127.0.0.1:{server.server_port}/{token}/", directory, server, thread
    )
    logger.info(
        "Viewer server started",
        extra={
            "epsm_event": "viewer.server.started",
            "epsm_context": {},
            "epsm_details": {"port": server.server_port},
        },
    )
    try:
        if launch_browser:
            webbrowser.open(handle.url)
    except BaseException:
        handle.close()
        raise
    return handle
