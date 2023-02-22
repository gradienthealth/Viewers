# ohif-viewer-static

@ischemaview/ohif-viewer built and bundled into static assets


## Build
### Prerequisite
yarn install run on ````root```` project or ````platform/viewer````
> NOTE: yarn@^1.18.0 required with workspaces-experimental=true. required.  See [README of ohif-monorepo](https://github.com/ischemaview/rapid-dicom-viewer#to-develop)
### Build
````bash
# From within the platform/viewer-static directory
yarn build

OR

npm run build
````

## Publish
````bash
# From within the platform/viewer-static directory
npm publish

OR

yarn publish
````
> NOTE: Nexus repository authentication required

## Installation
````
npm install @ischemaview/ohif-static-assets
````

### Copy via postinstall script (optional)
````bash
snippet of consuming projects package.json:

{
  ...
  "scripts": {
    "postinstall": "./node_modules/@ischemaview/ohif-viewer-static/scripts/copy-folder-recursive-cli ./node_modules/@ischemaview/ohif-viewer--static/dist <destination_directory_path>"
  },
  ....
}

# Where <destination_directory_path> is the desired location for static assets
````
