# CLAUDE.md

This file guides Claude Code (claude.ai/code) when it works in this repository.

## What this is

Gradient's fork of the [OHIF Viewer](https://github.com/OHIF/Viewers), a Yarn and Lerna monorepo. The viewer is served on GitHub Pages and loads de-identified DICOM from Gradient's cloud-optimized DICOM (COD) buckets. The review service embeds it to check series for burned-in PHI.

- `platform/app`: the application shell. Its `public/config/*.js` files are the runtime configs; `gradient_production.js` and `gradient.js` register one data source per institution bucket.
- `platform/core`, `platform/ui`, `platform/ui-next`: shared services, metadata, and UI components.
- `extensions/*`, `modes/*`: OHIF extensions and modes. Gradient's own extension, `@gradienthealth/ohif-gradienthealth-extension`, lives in [GradientExtensionsAndModes](https://github.com/gradienthealth/GradientExtensionsAndModes).

Upstream OHIF changes are brought in by hand. Keep upstream files in place so those syncs do not conflict.

## Commands

```bash
# Install (Node version in .node-version; Yarn 1)
yarn install --frozen-lockfile

# Unit tests: every Jest project under platform/ and extensions/
npx jest --ci

# One test file
cd platform/core && npx jest src/classes/MetadataProvider.test.ts

# Local viewer on http://localhost:3000 with a config that needs no sign-in
cd platform/app && APP_CONFIG=config/default.js yarn dev
```

`yarn dev:fast` (rsbuild) fails to build here; use `yarn dev`.

### Local development limits

- The npm build of `@gradienthealth/ohif-gradienthealth-extension` does not resolve `@cornerstonejs/tools` under the webpack dev server, and the longitudinal mode needs that extension's services. Link the extension's source from GradientExtensionsAndModes in its place, as the deploy does with `yarn run cli link-extension`.
- The COD data sources need `internal.getWadoRsWebServer` from Gradient's cornerstone fork, [cornerstone3D-beta](https://github.com/gradienthealth/cornerstone3D-beta). With npm cornerstone, a local build cannot open a COD bucket; load files through the `/local` route instead.

## Branches and deploys

- `production` is the default branch. Pull requests squash-merge into it, and their titles must start with a Linear issue ID or `NO-ISSUE`.
- Merging into `production` runs `deploy_production_ghpages.yml`. It builds against `cornerstone3D-beta@production` and `GradientExtensionsAndModes@production`, runs `yarn build:gradient:production` with `config/gradient_production.js`, and publishes to [gradienthealth/atlas](https://github.com/gradienthealth/atlas), served at https://gradienthealth.github.io/atlas/.
- Merging into `nightly` runs `deploy_ghpages.yml`, which builds the `nightly` branches of the same repositories with `config/gradient.js` and publishes to [gradienthealth/gradienthealth.github.io](https://github.com/gradienthealth/gradienthealth.github.io).
- Pull requests into `production` run the Jest suite (`unit-tests.yml`) and CodeQL (`codeql.yml`).
