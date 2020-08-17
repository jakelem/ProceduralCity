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
  iterations: 6,
  'Radius': 0.3,
  'Height': 0.3,
  'Grid Size': 8.0,
  'Random Color': false,
  'Radial Decay': 1.6,
  'Angle': 5,
  'Offset': -0.01,
  'Smooth Shading': true,
  'Buildings Only' : true,
  'Noise' : 0.02,
  'Make All Blocks' : false,
  'Max LOD Blocks':5,
  'Load Scene': loadScene, // A function pointer, essentially
  'Export OBJ': saveFile, // A function pointer, essentially
  'Draw Shadow Map': false, // A function pointer, essentially
  'Minor Frequency': 0.6,
  'Major Frequency': 0.95,
  'Height Noise': 0.1,
  'Radial Size' : 0.3,
  'Min Height': 0.35,
  'Max Height': 1.5,
  'Texture': 'NYC',

  'Window Freq' : 10

};

let shadowCreated = false;

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
  shadowCreated = false;
  background_meshes = new Array<Mesh>();
  grammar = new ShapeGrammar();
  grammar.buildings_only = controls["Buildings Only"]
  grammar.iterations = controls.iterations;
  grammar.gridDivs = controls["Grid Size"];
  grammar.blocks = controls["Max LOD Blocks"];
  grammar.all_blocks = controls["Make All Blocks"];
  grammar.perlin_scale = controls["Noise"]
  let campos = vec3.fromValues(-grammar.gridDivs * 0.9, 2.5, 0)
  grammar.cam_pos = campos
  //camera.setTarget(vec3.fromValues(0, 2, -3), vec3.fromValues(0, 2, grammar.gridDivs * grammar.cell_size * 0.75));
  //camera.setTarget(vec3.fromValues(0, 5, 0), vec3.fromValues(0, 0, 0));
 camera.setTarget(campos, vec3.fromValues(0, 0, 0));
 //camera.setTarget(vec3.fromValues(5, 2, 0), vec3.fromValues(0, 2, 0));

  //for single building scene 
  //camera.setTarget(vec3.fromValues(1, 0.3, 1), vec3.fromValues(0, 0, 0));
  grammar.randomColor = controls["Random Color"];
  grammar.minor_freq = controls["Minor Frequency"]
  grammar.major_freq = controls["Major Frequency"]
  grammar.window_freq = controls["Window Freq"]
  grammar.min_building_height = controls["Min Height"]
  grammar.max_building_height = controls["Max Height"]
  grammar.height_noise = controls["Height Noise"]
  grammar.center_size = controls["Radial Size"]

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
  square = new Square(vec3.fromValues(0, 0, 1.0));
  
  //m_roads = new Roads()
  //m_roads.expandAxiom();
  //m_roads.expandSegments();
  //m_roads.fillMesh();

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
  gui.add(controls, 'iterations', 0, 6).step(1);
  gui.add(controls, 'Grid Size', 3, 20).step(1);
  //gui.add(controls, 'Make All Blocks');
  gui.add(controls, 'Buildings Only');

  gui.add(controls, 'Max LOD Blocks', 0, 20).step(1);

  // gui.add(controls, 'Random Color');
  // gui.add(controls, 'Smooth Shading');
  gui.add(controls, 'Load Scene');
  gui.add(controls, 'Export OBJ');


  let buildings = gui.addFolder("Buildings");
 // buildings.add(controls, 'Window Freq', 0,20).step(0.5);;
  buildings.add(controls, 'Min Height', 0.1,5.0).step(0.1);;
  buildings.add(controls, 'Max Height', 0.1,5.0).step(0.1);;
  buildings.add(controls, 'Height Noise', 0.0,5.0).step(0.1);;

  let roads = gui.addFolder("Roads");
  roads.add(controls,'Noise', 0.0, 0.1).step(0.01);

  roads.add(controls,'Major Frequency', 0, 1.0).step(0.01);
  roads.add(controls,'Minor Frequency', 0, 1.0).step(0.01);
  roads.add(controls, 'Radial Size', 0.0,5.0).step(0.1);;


  let debug = gui.addFolder("Debug");
  debug.add(controls, 'Draw Shadow Map');

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

  const light = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/light-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/light-frag.glsl')),
  ]);

  const lambert = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/lambert-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/lambert-frag.glsl')),
  ]);

  lambert.createSkyBoxCubeMap();

  lambert.makeLightViewProj();

  const planet = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/planet-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/planet-frag.glsl')),
  ]);

  const background = new ShaderProgram([
    new Shader(gl.VERTEX_SHADER, require('./shaders/static-vert.glsl')),
    new Shader(gl.FRAGMENT_SHADER, require('./shaders/static-frag.glsl')),
  ]);
  background.createSkyBoxCubeMap();


  function makeTexturesForShaders(tex = "./textures/textures.png", norm = "./textures/normal_map.png") {
    light.createTexture(tex)
    lambert.createTexture(tex);
    lambert.createBump(norm);

  }

  makeTexturesForShaders()


  function updateTextures() {
    if(controls["Texture"] == "NYC") {
      makeTexturesForShaders()
    } else if(controls["Texture"] == 'Iceland') {
      makeTexturesForShaders("./textures/icelandtextures.png", "./textures/iceland_normal_map.png")
    } else {
      makeTexturesForShaders("./textures/icelandtextures.png", "./textures/iceland_normal_map.png")

    }
  }
  
  gui.add(controls, 'Texture', ['NYC','Iceland']).onChange(updateTextures);


  let time = 0.0;


  // This function will be called every frame
  function tick() {
    if(grammar.finishedLoading && !shadowCreated) {
      //if(!shadowCreated) {
        renderer.renderShadow(light, [
          grammar.fullMesh,
         // grammar.m_roads.fullMesh,
          //square
        ]);
        console.log("create shadow")
        shadowCreated = true;
    }
    camera.update();
    stats.begin();
    gl.viewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();





    time += 1;
    background.setCamPos(camera.controls.eye);

    background.setTime(time);
    
    //console.log(grammar.meshes);
    // for(let mesh of grammar.meshes) {
    //   renderer.render(camera, planet, [
    //     mesh,
    //   ]
    // );}
    lambert.setCamPos(camera.controls.eye);

    if(grammar.fullMesh !== undefined) {
      //if(!shadowCreated) {

      
      renderer.render(camera, lambert, [
        grammar.fullMesh,
        //grammar.m_roads.fullMesh
        //square
      ]);
    }

    if(controls["Draw Shadow Map"]) {
      renderer.render(camera, background, [
        square,
      ],undefined,true);
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
