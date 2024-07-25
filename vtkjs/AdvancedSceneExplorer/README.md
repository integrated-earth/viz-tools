# AdvancedSceneExplorer

This is a project building a visualization tool built on top of https://kitware.github.io/vtk-js/index.html to visualize 3d simulations in the browser. The current version is hosted at https://f.tjhei.info/ase/ and used for https://f.tjhei.info/viz-gallery/

Features:
- loading of vtkjs files (directly via URL or via dialog)
- automatic rotation when idle
- ability to specify an initial rotation of the model

Examples:
- https://f.tjhei.info/ase/v2/?fileURL=https://f.tjhei.info/viz-gallery/step-90-viz/step-90.vtkjs&orient=-90|0|0


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
