/* eslint-disable import/prefer-default-export */
/* eslint-disable import/no-extraneous-dependencies */

import '@kitware/vtk.js/favicon';

// Load the rendering pieces we want to use (for both WebGL and WebGPU)
import '@kitware/vtk.js/Rendering/Profiles/All';

import macro from '@kitware/vtk.js/macros';
import DataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper';
import HttpDataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper';
import vtkFullScreenRenderWindow from '@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow';
import vtkHttpSceneLoader from '@kitware/vtk.js/IO/Core/HttpSceneLoader';
import vtkURLExtract from '@kitware/vtk.js/Common/Core/URLExtract';

// Force DataAccessHelper to have access to various data source
import '@kitware/vtk.js/IO/Core/DataAccessHelper/HtmlDataAccessHelper';
import '@kitware/vtk.js/IO/Core/DataAccessHelper/JSZipDataAccessHelper';

import controlWidget from './SceneExplorerWidget';
import style from './SceneExplorer.module.css';

const iOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
let autoInit = true;
let widgetCreated = false;

let scene = null;
let interacting = false;
let wait = 5;
let orient = [0, 0, 0];// [0,-90,-90]; // initial rotation applied
let rotation = 0;
let renderWindow;

let animationPlaylist = [];
const loadedScenes = new Map();
let currentSceneIndex = 0;
let animationIntervalId = null;
const preloadBufferSize = 2;


// Add class to body if iOS device --------------------------------------------

if (iOS) {
  document.querySelector('body').classList.add('is-ios-device');
}

export function emptyContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

let cameraInitialized = false;

function initializeCamera(renderer) {
  if (cameraInitialized) {
    return;
  }
  cameraInitialized = true;

  const camera = renderer.getActiveCamera();
  // Get the bounds of all visible actors in the scene
  const bounds = renderer.computeVisiblePropBounds();

  // Calculate a new camera position and focal point to encompass the entire scene
  const centerX = (bounds[0] + bounds[1]) / 2;
  const centerY = (bounds[2] + bounds[3]) / 2;
  const centerZ = (bounds[4] + bounds[5]) / 2;

  const diagonal = Math.sqrt(
    ((bounds[1] - bounds[0]) ** 2)
    + ((bounds[3] - bounds[2]) ** 2)
    + ((bounds[5] - bounds[4]) ** 2),
  );

  const distance = (1.2 * diagonal) / (2 * Math.tan((camera.getViewAngle() * Math.PI) / 360.0));

  // Set the new camera position and focal point
  camera.set({
    position: [centerX, centerY - distance, centerZ + (0.2 * distance)],
    focalPoint: [centerX, centerY, centerZ],
  });
  camera.setPhysicalViewUp(0, -1, 0);
  camera.setPhysicalViewNorth(0, 0, 1);

  const interactor = renderWindow.getInteractor();
  console.log(interactor);
  interactor.initialize();
  interactor.requestAnimation('CameraModifiedEvent');

  const is = interactor.getInteractorStyle();

  is.onStartInteractionEvent(() => {
    console.log('Interaction started!');
    interacting = true;
  });
  is.onEndInteractionEvent(() => {
    console.log('Interaction ended!');
    wait = 20;
    interacting = false;
  });

  renderer.resetCameraClippingRange();
  const cr = camera.getClippingRange();
  console.log(cr);
  camera.setClippingRange(0.1 * cr[0], cr[1]);
}

function applyInitialActorTransforms(importer) {
  const scene = importer.getScene();
  const nActors = scene.length;
  const commonCenter = scene.reduce((acc, actor) => {
    const actorCenter = actor.actor.getCenter();
    return [
      acc[0] + actorCenter[0],
      acc[1] + actorCenter[1],
      acc[2] + actorCenter[2],
    ];
  }, [0, 0, 0]);

  commonCenter[0] /= nActors;
  commonCenter[1] /= nActors;
  commonCenter[2] /= nActors;

  scene.forEach((actor) => {
    actor.actor.setOrigin(commonCenter);
    actor.actor.setOrientation(orient[0], orient[1], orient[2]);
    actor.actor.rotateWXYZ(45, 0, 0, 1);
  });
}

function setupActiveScene(importer, renderer) {
  console.log(`File successfully loaded: ${importer.getUrl()}`);
  renderWindow.render();

  scene = importer.getScene();

  // Add UI to dynamically change rendering settings
  if (!widgetCreated) {
    widgetCreated = true;
    controlWidget(
      document.querySelector('body'),
      importer.getScene(),
      renderWindow.render,
    );
  }
}

function loadScenePromise(url, renderer) {
  console.log(`Starting to load: ${url}`);
  return new Promise((resolve, reject) => {
    let sceneImporter = null;
    let ready = false;
    const onReadyCb = () => {
      if (ready) {
        return;
      }
      ready = true;
      console.log(`Finished loading: ${url}`);
      resolve(sceneImporter);
    };

    if (url.endsWith('.vtkjs')) {
      HttpDataAccessHelper.fetchBinary(url)
        .then((zipContent) => {
          const dataAccessHelper = DataAccessHelper.get('zip', {
            zipContent,
            callback: () => {
              sceneImporter = vtkHttpSceneLoader.newInstance({
                renderer,
                dataAccessHelper,
              });
              sceneImporter.onReady(onReadyCb);
              sceneImporter.setUrl('index.json');
            },
          });
        })
        .catch((error) => {
          console.error(`Failed to fetch/process vtkjs ${url}`, error);
          reject(error);
        });
    } else {
      sceneImporter = vtkHttpSceneLoader.newInstance({ renderer });
      sceneImporter.onReady(onReadyCb);
      sceneImporter.setUrl(url);
      try {
        sceneImporter.update();
      } catch (e) {
        reject(e);
      }
    }
  });
}

function startAnimationCycle(playlist, renderer, renderWindow) {
  animationPlaylist = playlist;
  currentSceneIndex = 0;
  const loadingScenes = new Set();

  function updateFrameCounter() {
    const frameCounterContainer = document.querySelector(
      `.${style.frameCounter}`,
    );
    if (frameCounterContainer) {
      const loadedPercentage = Math.round(
        (loadedScenes.size / animationPlaylist.length) * 100,
      );
      let text = `Frame: ${currentSceneIndex + 1} / ${
        animationPlaylist.length
      }`;
      if (loadedPercentage < 100) {
        text += ` - loading ${loadedPercentage}%`;
      }
      frameCounterContainer.innerHTML = text;
    }
  }

  function preloadNextScenes() {
    for (let i = 1; i <= preloadBufferSize; i++) {
      const nextIndex = (currentSceneIndex + i) % animationPlaylist.length;
      const nextUrl = animationPlaylist[nextIndex];
      if (!loadedScenes.has(nextUrl) && !loadingScenes.has(nextUrl)) {
        loadingScenes.add(nextUrl);
        loadScenePromise(nextUrl, renderer).then((sceneImporter) => {
          loadedScenes.set(nextUrl, sceneImporter);
          loadingScenes.delete(nextUrl);
          updateFrameCounter();
        });
      }
    }
  }

  function showNextScene() {
    const speed = 500;

    if (interacting) {
      animationIntervalId = setTimeout(showNextScene, speed);
      return;
    }

    const currentUrl = animationPlaylist[currentSceneIndex];

    if (loadedScenes.has(currentUrl)) {
      const sceneImporter = loadedScenes.get(currentUrl);
      // Hide all scenes except the current one.
      loadedScenes.forEach((importer, url) => {
        const isCurrent = url === currentUrl;
        importer.getScene().forEach((actor) => {
          actor.actor.setVisibility(isCurrent);
        });
      });
      setupActiveScene(sceneImporter, renderer);

      renderWindow.render();

      updateFrameCounter();

      preloadNextScenes();
      currentSceneIndex = (currentSceneIndex + 1) % animationPlaylist.length;
      animationIntervalId = setTimeout(showNextScene, speed);
    } else {
      // if the current scene isn't loaded, wait for it
      setTimeout(showNextScene, 100);
    }
  }

  // Kick off the animation
  const firstUrl = animationPlaylist[0];
  if (!loadedScenes.has(firstUrl) && !loadingScenes.has(firstUrl)) {
    loadingScenes.add(firstUrl);
    loadScenePromise(firstUrl, renderer).then((sceneImporter) => {
      loadedScenes.set(firstUrl, sceneImporter);
      loadingScenes.delete(firstUrl);
      showNextScene();
    });
  } else {
    showNextScene();
  }
}
// animation: spin the scene
function step() {
  if (scene && !interacting) {
    if (wait > 0) {
      wait -= 1;
      return;
    }
    rotation += 5;
    scene.forEach((actor) => {
      actor.actor.setOrientation(orient[0], orient[1], rotation + orient[2]);
    });

    renderWindow.render();
  }
}

function fetchAnimationPlaylist(url) {
  return HttpDataAccessHelper.fetchText({}, url).then((content) =>
    content.split('\n').filter((line) => line.trim().length > 0),
  );
}

export function load(container, options) {
  autoInit = false;
  emptyContainer(container);

  // Add a container for the animation frame number
  const frameCounterContainer = document.createElement('div');
  frameCounterContainer.setAttribute('class', style.frameCounter);
  container.appendChild(frameCounterContainer);

  const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
    background: [1, 1, 1],
    rootContainer: container,
    containerStyle: { height: '100%', width: '100%', position: 'absolute' },
  });
  const renderer = fullScreenRenderer.getRenderer();
  renderWindow = fullScreenRenderer.getRenderWindow();
  global.renderWindow = renderWindow;

  const sceneImporter = vtkHttpSceneLoader.newInstance({ renderer });

  function onReady(importer) {
    importer.onReady(() => {
      setupActiveScene(importer, renderer);
      if (!options.animationListURL) {
        applyInitialActorTransforms(importer);
        initializeCamera(renderer);
      }
    });

    window.addEventListener('dblclick', () => {
      importer.resetScene();
      renderWindow.render();
    });
  }

  if (options.url) {
    sceneImporter.setUrl(options.url);
    onReady(sceneImporter);
  } else if (options.animationListURL) {
    fetchAnimationPlaylist(options.animationListURL)
      .then((playlist) => {
        console.log('Playlist:', playlist);
        startAnimationCycle(playlist, renderer, renderWindow);
      })
      .catch((error) => {
        console.error('Could not fetch or process animation playlist:', error);
        // Optionally, display an error message to the user in the UI
      });
  } else if (options.fileURL) {

    const progressContainer = document.createElement('div');
    progressContainer.setAttribute('class', style.progress);
    container.appendChild(progressContainer);

    const progressCallback = (progressEvent) => {
      if (progressEvent.lengthComputable) {
        const percent = Math.floor(
          (100 * progressEvent.loaded) / progressEvent.total,
        );
        progressContainer.innerHTML = `Loading ${percent}%`;
      } else {
        progressContainer.innerHTML = macro.formatBytesToProperUnit(
          progressEvent.loaded,
        );
      }
    };

    HttpDataAccessHelper.fetchBinary(options.fileURL, {
      progressCallback,
    }).then((zipContent) => {
      container.removeChild(progressContainer);
      const dataAccessHelper = DataAccessHelper.get('zip', {
        zipContent,
        callback: (zip) => {
          const sceneImporter = vtkHttpSceneLoader.newInstance({
            renderer,
            dataAccessHelper,
          });
          sceneImporter.setUrl('index.json');
          onReady(sceneImporter);
        },
      });
    });
  } else if (options.file) {
    const dataAccessHelper = DataAccessHelper.get('zip', {
      zipContent: options.file,
      callback: (zip) => {
        const sceneImporter = vtkHttpSceneLoader.newInstance({
          renderer,
          dataAccessHelper,
        });
        sceneImporter.setUrl('index.json');
        onReady(sceneImporter);
      },
    });
  }
}

export function initLocalFileLoader(container) {
  autoInit = false;
  const exampleContainer = document.querySelector('.content');
  const rootBody = document.querySelector('body');
  const myContainer = container || exampleContainer || rootBody;

  if (myContainer !== container) {
    myContainer.classList.add(style.fullScreen);
    rootBody.style.margin = '0';
    rootBody.style.padding = '0';
  } else {
    rootBody.style.margin = '0';
    rootBody.style.padding = '0';
  }

  const fileContainer = document.createElement('div');
  fileContainer.innerHTML = `<div class="${style.bigFileDrop}"/><input type="file" accept=".zip,.vtkjs" style="display: none;"/>`;
  myContainer.appendChild(fileContainer);

  const fileInput = fileContainer.querySelector('input');

  function handleFile(e) {
    preventDefaults(e);
    const { dataTransfer } = e;
    const files = e.target.files || dataTransfer.files;
    if (files.length === 1) {
      myContainer.removeChild(fileContainer);
      const ext = files[0].name.split('.').slice(-1)[0];
      load(myContainer, { file: files[0], ext });
    }
  }

  fileInput.addEventListener('change', handleFile);
  fileContainer.addEventListener('drop', handleFile);
  fileContainer.addEventListener('click', () => fileInput.click());
  fileContainer.addEventListener('dragover', preventDefaults);
}

// Look at URL an see if we should load a file
// ?fileURL=https://data.kitware.com/api/v1/item/587003d08d777f05f44a5c98/download?contentDisposition=inline
const userParams = vtkURLExtract.extractURLParameters();

if (userParams.orient) {
  orient = userParams.orient.split('|').map((s) => Number(s));
  console.log('parsing orient: ', orient);
}

if (userParams.url || userParams.fileURL) {
  const exampleContainer = document.querySelector('.content');
  const rootBody = document.querySelector('body');
  const myContainer = exampleContainer || rootBody;
  if (myContainer) {
    myContainer.classList.add(style.fullScreen);
    rootBody.style.margin = '0';
    rootBody.style.padding = '0';
  }
  load(myContainer, userParams);
} else if (userParams.animationListURL) {
  const exampleContainer = document.querySelector('.content');
  const rootBody = document.querySelector('body');
  const myContainer = exampleContainer || rootBody;
  if (myContainer) {
    myContainer.classList.add(style.fullScreen);
    rootBody.style.margin = '0';
    rootBody.style.padding = '0';
  }
  load(myContainer, userParams);
} else {
  // Auto setup if no method get called within 100ms
  setTimeout(() => {
    if (autoInit) {
      initLocalFileLoader();
    }
  }, 100);
}

if (!userParams.animationListURL) {
  setInterval(step, 100);
}
