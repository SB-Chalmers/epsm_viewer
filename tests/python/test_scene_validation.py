"""Display rejects malformed transport values before touching output paths."""

import json

import pytest
from epsm_viewer import scene_widget, write_scene
from test_display import scene


@pytest.mark.parametrize(
    "change",
    [
        {"schema": "epsm.scene/2"},
        {"units": "mm"},
        {"up_axis": "Y"},
        {"objects": {}},
        {"report": []},
        {"preparation": []},
        {"diagnostics": {"value": float("nan")}},
        {"report": {"value": float("inf")}},
        {
            "objects": [
                {
                    "id": "face",
                    "name": "face",
                    "kind": "surface",
                    "vertices": [[0, 0], [1, 0, 0], [0, 1, 0]],
                    "holes": [],
                    "metadata": {},
                }
            ]
        },
    ],
)
def test_invalid_scene_never_creates_output(change, tmp_path):
    target = tmp_path / "invalid"
    with pytest.raises((TypeError, ValueError)):
        write_scene({**scene(), **change}, target)
    assert not target.exists()


def test_bundle_failure_keeps_destination_absent_and_removes_staging(tmp_path, monkeypatch):
    from epsm_viewer import io

    def fail(*args):
        raise OSError("Publication unavailable")

    monkeypatch.setattr(io, "_publish_directory", fail)
    with pytest.raises(OSError, match="Publication unavailable"):
        write_scene(scene(), tmp_path / "preview")
    assert list(tmp_path.iterdir()) == []


def test_existing_empty_directory_is_never_replaced(tmp_path):
    target = tmp_path / "already-present"
    target.mkdir()
    with pytest.raises(FileExistsError):
        write_scene(scene(), target)
    assert target.is_dir() and list(target.iterdir()) == []


@pytest.mark.parametrize("identifiers", [[""], ["wall", "wall"]])
def test_scene_object_ids_are_nonempty_and_unique(identifiers, tmp_path):
    supplied = scene()
    supplied["objects"] = [
        {
            "id": identifier,
            "name": "wall",
            "kind": "surface",
            "metadata": {},
            "vertices": [[0, 0, 0], [1, 0, 0], [0, 1, 0]],
            "holes": [],
        }
        for identifier in identifiers
    ]
    with pytest.raises(ValueError, match="[Ii][Dd]|[Ii]dentif"):
        write_scene(supplied, tmp_path / "invalid")
    assert not (tmp_path / "invalid").exists()


@pytest.mark.parametrize("field", ["source_geometry", "cleaned_geometry"])
def test_preparation_rejects_malformed_known_geometry(field, tmp_path):
    supplied = {**scene(), "preparation": {field: {"type": "Polygon", "coordinates": [None]}}}
    with pytest.raises(ValueError, match="[Pp]reparation"):
        write_scene(supplied, tmp_path / "invalid")
    assert not (tmp_path / "invalid").exists()


def test_preparation_preserves_valid_polygons_and_unknown_evidence(tmp_path):
    ring = [[0, 0], [1, 0], [0, 1]]
    preparation = {
        "source_geometry": {"type": "Polygon", "coordinates": [ring]},
        "cleaned_geometry": {"type": "MultiPolygon", "coordinates": [[ring]]},
        "source_reference": {"identifier": "source-outline", "notes": ["Retain this evidence"]},
    }
    directory = write_scene({**scene(), "preparation": preparation}, tmp_path / "preview")
    assert json.loads((directory / "model.json").read_text())["preparation"] == preparation


def test_file_publication_is_complete_and_index_is_last(tmp_path, monkeypatch):
    from epsm_viewer import io

    original = io.os.link
    published = []

    def observe(source, target):
        assert source.read_bytes()
        assert not (target.parent / "index.html").exists()
        original(source, target)
        assert target.read_bytes() == source.read_bytes()
        published.append(target.name)

    monkeypatch.setattr(io.os, "link", observe)
    write_scene(scene(), tmp_path / "preview")
    assert published[-1] == "index.html"


def test_partial_write_failure_preserves_concurrent_unrelated_files(tmp_path, monkeypatch):
    from epsm_viewer import io

    original = io.os.link
    attempts = 0
    destination = tmp_path / "preview"

    def fail_second(source, target):
        nonlocal attempts
        attempts += 1
        if attempts == 2:
            (destination / "unrelated.txt").write_text("another writer")
            raise OSError("File publication unavailable")
        original(source, target)

    monkeypatch.setattr(io.os, "link", fail_second)
    with pytest.raises(OSError, match="File publication unavailable"):
        write_scene(scene(), destination)
    assert [path.name for path in destination.iterdir()] == ["unrelated.txt"]
    assert (destination / "unrelated.txt").read_text() == "another writer"
    assert not (destination / "index.html").exists()


def test_widget_has_independent_state_and_validates_replacement_scene():
    pytest.importorskip("anywidget")
    supplied = scene()
    first, second = scene_widget(supplied), scene_widget(scene(), height=400)
    try:
        assert first.model_id != second.model_id
        assert first.scene == scene() and second.scene == scene()
        assert second.height == 400
        first.selected_surface = "surface-1"
        assert second.selected_surface == ""
        supplied["report"]["caller_edit"] = True
        assert "caller_edit" not in first.scene["report"]
        assert first.traits()["scene"].metadata["sync"]
        assert first.traits()["height"].metadata["sync"]
        assert first.traits()["selected_surface"].metadata["sync"]
        assert json.loads(json.dumps(first.scene, allow_nan=False)) == scene()
        with pytest.raises((TypeError, ValueError)):
            first.scene = {**scene(), "schema": "future"}
        assert first.scene == scene()
    finally:
        first.close()
        second.close()
