# AdvancedSceneExplorer

This is a project building a visualization tool built on top of https://kitware.github.io/vtk-js/index.html to visualize 3d simulations in the browser. The current version is hosted at https://f.tjhei.info/ase/ and used for https://f.tjhei.info/viz-gallery/

Features:
- loading of vtkjs files (directly via URL or via dialog)
- automatic rotation when idle
- ability to specify an initial rotation of the model

Examples:
- https://f.tjhei.info/ase/v2/?fileURL=https://f.tjhei.info/viz-gallery/step-90-viz/step-90.vtkjs&orient=-90|0|0

## URL Options

This application supports the following URL parameters for loading data and configuring the initial view:

- **`url`**: Specifies a direct URL to a VTK.js scene file (e.g., `?url=https://example.com/my_scene.json`).
- **`fileURL`**: Specifies a URL to a zipped VTK.js scene archive (e.g., `?fileURL=https://example.com/my_archive.zip`). The application will automatically extract and load the `index.json` file from within the archive.
- **`orient`**: Sets the initial orientation of the loaded model. The value should be a pipe-separated string of three numbers representing the X, Y, and Z rotation angles in degrees (e.g., `?orient=0|-90|0` for a 90-degree rotation around the Y-axis).

## Setup

1. get nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
or see https://github.com/nvm-sh/nvm

2. get node
```
nvm install --lts
```

3. install packages:
```
$ npm install
```

## Compilation / Testing
```
$ npm run start
```
	
## release:
```
$ npm run build
```
