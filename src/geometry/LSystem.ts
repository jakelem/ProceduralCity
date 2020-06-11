import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
class Turtle {
  position: vec3;
  orientation: vec3;
  depth : number;

  constructor() {
    this.position = vec3.fromValues(0,0,0);
    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 2;

  }

  copyshallow(t : Turtle) {
    vec3.copy(this.position, t.position);
    vec3.copy(this.orientation, t.orientation);
    this.depth = t.depth;
  }
}


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


  turtleStack : Array<Turtle>;

  meshes : Array<Mesh>;

  charExpansions : Map<string, string>;
  charToAction : Map<string, ()=> any>;
  expandedSentence : string;

  orientRand : number;
  constructor() {
    this.axiom = "X";
    this.turtleStack = new Array<Turtle>();
    this.meshes = new Array<Mesh>();
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
    this.meshes.push(mesh);

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
    for(let mesh of this.meshes) {
      mesh.load();
    }
  }

  

};

export default LSystem;
