# epsm_viewer guide

Run commands from the repository root unless stated otherwise.

An embeddable TypeScript viewer for building geometry and its inspection evidence.
It serves EPSM Studio, teaching notebooks and other consumers of loaded metric
scenes. Versioned releases are listed in the
[GitHub repository](https://github.com/SB-Chalmers/epsm_viewer/releases).

The viewer owns rendering, polygon triangulation, window cutouts, selection,
camera controls, display filters and resource cleanup. Core owns physical geometry
and its scene exports. Studio owns web adapters, forms, authentication, projects
and jobs. This package does not query databases, choose assumptions or simulate.

## Browser use

The npm package exports TypeScript declarations and ESM modules. Install a built
tarball with `npm install ./epsm_viewer-0.1.0.tgz`. Distribution uses private
GitHub artifacts; see [artifact installation](../docs/release.md). Three.js 0.180.0
is the declared rendering dependency.

```ts
import {mountViewer, type Scene} from 'epsm_viewer';

// The application supplies a validated scene from its own backend adapter.
const viewer = mountViewer(container, scene as Scene, {
  onSelect: selection => inspect(selection),
  height: '600px',
});
viewer.setScene(updatedScene);
viewer.setSelection('surface-id');
viewer.fit(true); // Include surrounding context.
viewer.dispose(); // Call when the component is unmounted.
```

`mountViewer` creates its own shadow DOM, so multiple instances need no shared
HTML IDs or global styles. It performs no network request. `setScene` validates
the replacement before disposing the current drawing. Selection events retain
the producer's object identity and physical metadata. `dispose` is idempotent.

## Scene contract

`epsm.scene/1` contains metres, Z-up coordinates, named polygon objects and opening
rings. Report, diagnostics, source-frame and physical-owner metadata remain plain
JSON. The viewer triangulates those polygons; it does not change physical inputs.
Empty scenes are valid drafts. Unsupported versions, units and invalid drawing
geometry fail explicitly.

Core owns the source schema through `epsm_core.scene_schema()`. The captured
[schema](../tests/fixtures/core-scene.schema.json) and
[draft fixture](../tests/fixtures/core-scene.json) exercise the cross-package contract.
They were generated through the public API of an installed Core **0.8.0** wheel,
from released main `b197e092eb0423de5a9547873a0f596493ab7536` (`v0.8.0`). The
[fixture provenance](../tests/fixtures/core-scene.provenance.json) retains the
synthetic inputs and file hashes. See
[scope and compatibility](../docs/extraction.md).

## Optional Python display

A small Python package from this repository hosts the same bundled viewer. It has
no runtime dependency on Core. Install the built wheel; add the `notebook` extra
for embedded widgets. Python 3.11 or later is required.

```python
from epsm_core import Footprint, GeometrySpec
from epsm_viewer import view_scene, scene_widget

geometry = GeometrySpec.from_footprint(
    Footprint.rectangle(12, 8), storeys=2, storey_height_m=3
)
scene = geometry.scene()  # Pure Core data export, without weather or an engine.
with view_scene(scene, launch_browser=False) as preview:
    print(preview.url)

# In a notebook with epsm_viewer[notebook] installed:
widget = scene_widget(scene, height=600)
display(widget)
# Close it when finished: widget.close()
```

The browser helper starts an explicitly requested tokenized loopback server and
returns a closeable handle. It serves an immutable allowlist of bundled files.
`write_scene(scene, directory)` writes a standalone bundle without starting a
server and refuses existing directories. `scene_widget` embeds the same renderer
without a loopback connection. Importing the package does none of these things.

## Develop and verify

Use Node.js 22 and npm for the browser package (the package requires at least
Node.js 20.19).

```sh
npm ci
npm test
npm run test:browser
python -m pip install '.[test,notebook]'
python -m pytest tests/python
python -m build
npm pack --ignore-scripts --pack-destination dist
python scripts/check-distributions.py
```

Run `npx playwright install chromium` once when Chromium is not installed. Browser
checks require a local HTTP port and actual WebGL rendering. `npm run build`
generates the offline browser/widget assets. **package.json** owns the version;
tracked `VERSION` and the npm lockfile must agree before the build starts. A
mismatch fails without rewriting either file. Build the Python source archive
and wheel after preparing those assets. The Python build backend checks the
version and resources and never invokes Node. The source archive includes the
prepared assets so its wheel can be rebuilt without Node.

CI builds JavaScript and runs the actual browser and npm consumer checks once.
Python 3.11 and 3.13 each test the installed wheel, including bundled resources
and notices. Clean source-archive rebuild and distribution inspection are release
gates. See the [private release preparation](../docs/release.md) for artifact commands.

The tests cover opening area, concave/courtyard geometry, scene validity,
selection, isolated instances, replacement and disposal, bundle access and
notebook state. These are software/geometry checks, not empirical validation of
a building-energy model.

## License and provenance

EPSM-owned software is [MIT](../LICENSE). Renderer, layout and display-hosting code
were extracted from Core with original attribution retained. Bundled Three.js
keeps its own MIT notice. See [third-party notices](../THIRD_PARTY_NOTICES.md).
