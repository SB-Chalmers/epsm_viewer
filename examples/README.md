# Viewer examples

1. Build with `npm run build`, serve this repository with a local static HTTP
   server, and open [01_browser.html](01_browser.html). It uses the package's
   [synthetic scene fixture](../tests/fixtures/core-scene.json) and public API.
2. Install the built Python wheel and run
   `python examples/02_display.py output/first-viewer` to write one synthetic wall
   as a standalone bundle. Use a new output directory for another run.

For Core integration, use the README's `GeometrySpec.scene()` example with built
Core and Viewer wheels installed. Database, weather and engine access are not
needed. A notebook additionally requires the `epsm_viewer[notebook]` extra.

Synthetic dimensions are teaching inputs, not observed building evidence.
