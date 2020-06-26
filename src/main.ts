import {vec3, vec4, mat4, mat3} from 'gl-matrix';
import * as Stats from 'stats-js';
import * as DAT from 'dat-gui';
import Icosphere from './geometry/Icosphere';
import Square from './geometry/Square';
import OpenGLRenderer from './rendering/gl/OpenGLRenderer';
import Camera from './Camera';
import {setGL} from './globals';
import ShaderProgram, {Shader} from './rendering/gl/ShaderProgram';
import Mesh from './geometry/Mesh';
import {Roads} from './geometry/Roads';

import ShapeGrammar from './geometry/ShapeGrammar';
import Orchids from './geometry/Orchids';

import {HalfEdgeMesh} from './geometry/HalfEdge';

// Define an object with application parameters and button callbacks
// This will be referred to by dat.GUI's functions that add GUI elements.
const controls = {
  tesselations: 5,
  iterations: 0,
  'Radius': 0.3,
  'Height': 0.3,
  'Grid Size': 1,
  'Random Color': false,
  'Radial Decay': 1.6,
  'Angle': 5,
  'Offset': -0.01,
  'Smooth Shading': true,
  'Load Scene': loadScene, // A function pointer, essentially
  'Export OBJ': saveFile, // A function pointer, essentially

};

let icosphere: Icosphere;
let square: Square;
let m_mesh: Mesh;
let grammar: ShapeGrammar;
let background_meshes : Array<Mesh>;
let m_he_mesh : HalfEdgeMesh;

let m_roads: Roads;

let orchid : Orchids;
function loadObjs() {
}

const camera = new Camera(vec3.fromValues(0, 2, -3), vec3.fromValues(0, 2, 20));


function loadScene() {
  background_meshes = new Array<Mesh>();
  grammar = new ShapeGrammar();
  grammar.iterations = controls.iterations;
  grammar.gridDivs = controls["Grid Size"];
  //camera.setTarget(vec3.fromValues(0, 2, -3), vec3.fromValues(0, 2, grammar.gridDivs * grammar.cell_size * 0.75));
  camera.setTarget(vec3.fromValues(0, 5, 0), vec3.fromValues(0, 0, 0));

  grammar.randomColor = controls["Random Color"];
  grammar.refreshGrammar();
  //console.log("SETNECE " + l_system.expandedSentence);
  //m_he_mesh = new HalfEdgeMesh();
  //m_he_mesh.createPlane();
  //m_he_mesh.loadMesh();
  //m_he_mesh.create();

  icosphere = new Icosphere(vec3.fromValues(0, 0, 0), 1, controls.tesselations);
  //icosphere.create();
  m_mesh = new Mesh('/geo/feather.obj',vec3.fromValues(0, 1, 0), vec3.fromValues(1, 1, 1), vec3.fromValues(98, 0, 0));
  //m_mesh.create();
  //m_mesh.center = vec4.fromValues(0, 1, 2, 1);
  square = new Square(vec3.fromValues(0, 0, 0));
  
  m_roads = new Roads()
  m_roads.expandAxiom();
  m_roads.expandSegments();
  m_roads.fillMesh();

 // grammar.m_roads.createAll();

  square.create();
}

function saveFile() {
  var FileSaver = require('file-saver');
  var blob = new Blob([grammar.fullMesh.exportObj()], {type: "text/plain;charset=utf-8"});
  FileSaver.saveAs(blob, "objExport.obj");  
}

function main() {
  // Initial display for framerate
  const stats = Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  // Add controls to the gui
  const gui = new DAT.GUI();
  //gui.add(controls, 'tesselations', 0, 8).step(1);
  gui.add(controls, 'iterations', 0, 8).step(1);
  gui.add(controls, 'Grid Size', 1, 10).step(1);
  gui.add(controls, 'Random Color');
  gui.add(controls, 'Smooth Shading');
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'Export OBJ');


  // get canvas and webgl context
  const canvas = <HTMLCanvasElement> document.getElementById('canvas');
  const gl = <WebGL2RenderingContext> canvas.getContext('webgl2');
  if (!gl) {
    alert('WebGL 2 not supported!');
  }
  // `setGL` is a function imported above which sets the value of `gl` in the `globals.ts` module.
  // Later, we can import `gl` from `globals.ts` to access it
  setGL(gl);

  // Initial call to load scene
  loadScene();


  const renderer = new OpenGLRenderer(canvas);
  renderer.setClearColor(225/255, 240/255, 246/255, 1);
  gl.enable(gl.DEPTH_TEST);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  lambert.createTexture();

  const planet = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/planet-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/planet-frag.glsl')),
  ]);

  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/static-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/static-frag.glsl')),
  ]);

  let time = 0.0;
  // This function will be called every frame
  function tick() {

    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    renderer.render(camera, background, [
      square,
    ]);
    renderer.render(camera, lambert, [
      //icosphere,
      //m_mesh,
    ]);

    renderer.render(camera, planet, [
      //icosphere,
      grammar.m_roads.fullMesh
    ]);

    time += 1;
    background.setTime(time);
    //console.log(grammar.meshes);
    // for(let mesh of grammar.meshes) {
    //   renderer.render(camera, planet, [
    //     mesh,
    //   ]
    // );}

    if(grammar.fullMesh !== undefined) {
      renderer.render(camera, lambert, [
        grammar.fullMesh,
      ]);
    }


    let ts = 0.01;
    stats.end();

    // Tell the browser to call `tick` again whenever it renders a new frame
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.setAspectRatio(window.innerWidth / window.innerHeight);
    camera.updateProjectionMatrix();
  }, false);

  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.setAspectRatio(window.innerWidth / window.innerHeight);
  camera.updateProjectionMatrix();

  // Start the render loop
  tick();
}

main();
