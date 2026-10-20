# Private Viewer release preparation

The private `SB-Chalmers/epsm_viewer` repository exists. Version 0.1.0 is a release
candidate: no branch push, tag, GitHub release, npm or PyPI publication has been
performed during this preparation. The npm package has `private: true` to prevent
an accidental package-index publication. The Python package has no publication
workflow. Publishing remains a coordinated release step.

## Version and artifact ownership

`package.json` owns the version. Update it, tracked `VERSION`, and the npm lockfile
deliberately in the same release change. `npm run build` checks agreement before
compiling and never rewrites `VERSION`. Python packaging also refuses a mismatch
and missing prepared assets. A source checkout needs `npm ci && npm run build`
before creating Python distributions. A released source archive already contains
the browser and widget resources and can rebuild its wheel without Node.

The package-check workflow builds JavaScript once under Node 22. It then runs the
geometry/version tests, an actual Chromium/WebGL suite, and one independent npm
consumer installation. That job builds the wheel and source archive, inspects
metadata/resources/licenses in all three distributions, and rebuilds a clean
source archive with an empty executable search path. Two downstream jobs test
the same installed wheel under Python 3.11 and 3.13 without adding the source
package directory to Python's import path. It runs for PRs targeting `dev` or
`main`, pushes to `main`, and manual requests. Superseded PR jobs are cancelled.

## Download and install private artifacts

Authenticate GitHub CLI with an account that can read the private repository.
After a successful workflow run, substitute its actual run ID:

```sh
gh run download RUN_ID --repo SB-Chalmers/epsm_viewer \
  --name viewer-distributions --dir viewer-artifacts
npm install ./viewer-artifacts/epsm_viewer-0.1.0.tgz
python -m pip install ./viewer-artifacts/epsm_viewer-0.1.0-py3-none-any.whl
```

CI artifacts expire after 14 days. After a coordinated `v0.1.0` GitHub release
has actually been created and the checked distributions attached, consumers can
download durable release assets instead:

```sh
gh release download v0.1.0 --repo SB-Chalmers/epsm_viewer \
  --pattern 'epsm_viewer-0.1.0*' --dir viewer-artifacts
```

For notebook use, install the same wheel with its optional dependencies:

```sh
python -m pip install './viewer-artifacts/epsm_viewer-0.1.0-py3-none-any.whl[notebook]'
```

Do not place access tokens, SSH keys or credentials in package URLs or committed
consumer configuration. Installed artifacts contain the renderer, Python display
helpers and MIT notices; they do not need runtime repository access or Core.

## Remaining coordinated release gates

1. Capture the schema and synthetic fixture through public Core scene APIs at
   the final Core 0.8 commit and record that exact provenance. The current fixture
   remains honestly labelled as an earlier candidate in the README.
2. Review the candidate change, merge through `dev` to `main`, and let the private
   repository's package-check workflow pass on the resulting commit.
3. Create the agreed tag and GitHub release and attach those checked npm, wheel
   and source-archive files. No package-index publication is needed.
4. Only then promote a pinned Viewer revision in consuming compatibility records.
   Studio adapters continue to live in Studio; this package does not acquire data
   or implement project/authentication/job APIs.
