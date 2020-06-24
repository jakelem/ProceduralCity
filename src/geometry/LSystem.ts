import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
import Turtle from './Turtle';
var OBJ = require('webgl-obj-loader') ;


class LSystem  {
  axiom : string;
  currTurtle : Turtle;
  buffer: ArrayBuffer;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  iterations :number;
  center: vec4;
  decay : number;
  stepDecay : number;
  radius : number;
  height : number;
  offset : number;
  curvature : number;
  smoothshading : boolean;

  turtleStack : Array<Turtle>;

  meshes : Array<Mesh>;
  fullMesh : Mesh;
  meshNames : Map<string, Mesh>;

  charExpansions : Map<string, string>;
  charToAction : Map<string, ()=> any>;
  expandedSentence : string;

  orientRand : number;
  constructor() {
    this.axiom = "X";
    this.turtleStack = new Array<Turtle>();
    this.meshes = new Array<Mesh>();
    this.fullMesh = new Mesh("");
    this.iterations = 3;
    this.charExpansions = new Map();
    this.charToAction = new Map();
    this.expandedSentence = "";
    this.currTurtle = new Turtle();
    this.currTurtle.orientation = vec3.fromValues(0,1,0);
    this.orientRand = 0;
    this.fillCharExpansions();
    this.fillCharToAction();
    this.curvature = 5;
    this.height = 0.2;
    this.smoothshading = true;
  }


    fillMeshNames() {
    this.meshNames = new Map<string, Mesh>();
    OBJ.downloadMeshes({
      'orchid': './geo/orchid.obj',
      'stem': './geo/stem.obj',
      'leaf': './geo/leaf.obj',
      'petal': './geo/petal.obj',

    }, (meshes: any) => {
      let orchid = new Mesh('./geo/orchid.obj');
      orchid.loadMesh(meshes.orchid);
      let stem = new Mesh('./geo/stem.obj');
      stem.loadMesh(meshes.stem);
      let leaf = new Mesh('./geo/leaf.obj');
      leaf.loadMesh(meshes.leaf);
      let petal = new Mesh('./geo/petal.obj');
      petal.loadMesh(meshes.petal);

      this.meshNames.set("orchid", orchid);
      this.meshNames.set("stem", stem);
      this.meshNames.set("leaf", leaf);
      this.meshNames.set("petal", petal);

      //this.loadMesh(meshes.mesh);
      this.expandAxiom();
      this.moveTurtle();
      this.createAll();
    
      //console.log()
    });
  }

  setAxiom() {
    this.axiom = "X";

  }
  refreshSystem() {
    this.setAxiom();
    this.fillMeshNames();
  }

  fillCharToAction() {
    this.charToAction.set('F', () => {
      this.advanceTurtle();
    });

    this.charToAction.set('>', () => {
      this.rotateTurtleX();
    });


    this.charToAction.set('.', () => {
      this.rotateTurtleZ();
    });


    this.charToAction.set('[', () => {
      this.pushTurtle();
    });

    this.charToAction.set(']', () => {
      this.popTurtle();
    });
  }

  advanceTurtle() {
    let mesh = new Mesh('/geo/feather.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(1,1,1), vec3.clone(this.currTurtle.orientation))
   // this.fullMesh.transformAndAppend(this.meshNames.get("stem"), mesh.transform, mesh.m_color);

    let rotMat = mat4.create();
    mat4.rotateX(rotMat, rotMat, this.currTurtle.orientation[0] * Math.PI / 180)
    mat4.rotateY(rotMat, rotMat, this.currTurtle.orientation[1] * Math.PI / 180)
    mat4.rotateZ(rotMat, rotMat, this.currTurtle.orientation[2] * Math.PI / 180)

    let step = vec3.fromValues(0,1,0);
    vec3.transformMat4(step, step, rotMat);

    //vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, this.currTurtle.depth);
    vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, 1);

  }

  rotateTurtleX() {
    this.currTurtle.orientation[0] += 30;
  }



  rotateTurtleXBy(angle:number) {
    this.currTurtle.orientation[0] += angle + Math.random() * this.orientRand - 0.5 * this.orientRand;
  }


  rotateTurtleYBy(angle:number) {
    this.currTurtle.orientation[1] += angle +  Math.random() * this.orientRand - 0.5 * this.orientRand;
  }
  rotateTurtleY() {
    this.currTurtle.orientation[1] += 30;
  }

  rotateTurtleZ() {
    this.currTurtle.orientation[2] += 30;
  }

  rotateTurtleZBy(angle:number) {
    this.currTurtle.orientation[2] += angle +  Math.random() * this.orientRand - 0.5 * this.orientRand;
  }

  
  fillCharExpansions() {
    console.log("regular EXPANSION");

    this.charExpansions.set('X', 'X.>>[X[.F].>F.F[XF]FX]');
  }

  pushTurtle() {
    this.turtleStack.push(this.currTurtle);
    let prevTurtle = this.currTurtle;
    this.currTurtle = new Turtle();
    this.currTurtle.copyshallow(prevTurtle);

  }

  popTurtle() {
    this.currTurtle = this.turtleStack.pop();
    //console.log(this.currTurtle);

  }

  expandAxiom() {
    let prevAxiom = this.axiom;
    for(let i = 0; i < this.iterations;i++) {
      let sentence :string = "";
      for(let c of prevAxiom) {
        if(this.charExpansions.get(c) == undefined) {
          sentence = sentence.concat(c);

        } else {
          sentence = sentence.concat(this.charExpansions.get(c).toString());

        }
      }
      prevAxiom = sentence;

    }
    this.expandedSentence = prevAxiom;
  }

  moveTurtle() {
    for(let c of this.expandedSentence) {
      if(this.charToAction.get(c) == undefined) {
        continue;
      }
      this.charToAction.get(c)();
    }
  }

  createAll() {
    //console.log("creating all");
    this.fullMesh.create();
    //console.log(this.fullMesh);

  }

  

};

export default LSystem;
