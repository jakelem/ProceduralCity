import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
import LSystem from './LSystem';
class Turtle {
  position: vec3;
  orientation: vec3;
  depth : number;

  constructor() {
    this.position = vec3.fromValues(0,0,0);
    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 1;

  }

  copyshallow(t : Turtle) {
    vec3.copy(this.position, t.position);
    vec3.copy(this.orientation, t.orientation);
    this.depth = t.depth;
  }
}


class Orchids extends LSystem  {

  orchidSize : number;

  constructor() {
    super();
    this.axiom = "X";
    this.turtleStack = new Array<Turtle>();
    this.meshes = new Array<Mesh>();
    this.iterations = 3;
    this.charExpansions = new Map();
    this.charToAction = new Map();
    this.expandedSentence = "";
    this.currTurtle = new Turtle();
    this.currTurtle.orientation = vec3.fromValues(0,1,0);
    this.decay = 0.2;
    this.stepDecay = 0.1;
    this.orchidSize = 0.3;
    this.radius = 0.2;
    this.offset = -0.01;

    this.charExpansions.clear();
;   this.charToAction.clear();
    this.fillCharExpansions();
    this.fillCharToAction();

  }

  fillCharToAction() {
    this.charToAction.set('F', () => {
      this.advanceTurtle();
    });

    this.charToAction.set('A', () => {
      this.advanceTurtle();
    });

    this.charToAction.set('B', () => {
      this.advanceTurtle();
    });

    this.charToAction.set('>', () => {
      this.rotateTurtleXBy(this.curvature);
    });

    this.charToAction.set('<', () => {
      this.rotateTurtleXBy(-this.curvature);
    });




    this.charToAction.set('.', () => {
      this.rotateTurtleZBy(this.curvature);
    });

    this.charToAction.set('-', () => {
      this.rotateTurtleZBy(-this.curvature);
    });
    this.charToAction.set('+', () => {
      this.rotateTurtleZBy(this.curvature);
    });


    this.charToAction.set('y', () => {
      this.rotateTurtleYBy(-10);
    });

    this.charToAction.set('u', () => {
      this.rotateTurtleYBy(10);
    });



    this.charToAction.set('[', () => {
      this.pushTurtle();
    });

    this.charToAction.set(']', () => {
      this.popTurtle();
    });

    this.charToAction.set('s', () => {
      this.sproutBud();
    });

    this.charToAction.set('l', () => {
      this.sproutLeaf();
    });0
  }

  advanceTurtle() {
    console.log("advancingturtle");
    let sF = Math.exp(-this.currTurtle.depth * this.decay) * this.radius;
    let sStep = Math.exp(-this.currTurtle.depth * this.stepDecay) * this.height;

    let mesh = new Mesh('/geo/stem.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(sF,sStep,sF), 
    vec3.clone(this.currTurtle.orientation), vec4.fromValues(0.29,0.17,0.11,1))
    this.meshes.push(mesh);

    let rotMat = mat4.create();
    mat4.rotateX(rotMat, rotMat, this.currTurtle.orientation[0] * Math.PI / 180)
    mat4.rotateY(rotMat, rotMat, this.currTurtle.orientation[1] * Math.PI / 180)
    mat4.rotateZ(rotMat, rotMat, this.currTurtle.orientation[2] * Math.PI / 180)

    let offset = this.height / 20;
    let step = vec3.fromValues(0,sStep  - offset,0);
    vec3.transformMat4(step, step, rotMat);
    this.currTurtle.depth += 1;
    //vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, this.currTurtle.depth);
    vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, 1);

  }

  sproutBud() {
    let mesh = new Mesh('/geo/orchid.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(this.orchidSize, this.orchidSize, this.orchidSize), vec3.clone(this.currTurtle.orientation),
    vec4.fromValues(1,1,1,1))
    this.meshes.push(mesh);

  }

  sproutLeaf() {
    let sF = Math.exp(-this.currTurtle.depth);

    let mesh = new Mesh('/geo/leaf.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(sF,1,sF), vec3.clone(this.currTurtle.orientation),
    vec4.fromValues(0.38,0.51,0.33,1))
    this.meshes.push(mesh);

  }

  rotateTurtleX() {
    this.currTurtle.orientation[0] += 30;
  }



  rotateTurtleY() {
    this.currTurtle.orientation[1] += 30;
  }

  rotateTurtleZ() {
    this.currTurtle.orientation[2] += 30;
  }



  fillCharExpansions() {
    console.log("orchids EXPANSION");
    this.charExpansions.set('X', 'A+B>F-A<B+F-[>>>>>>Xs][++++++<<<<<<Xs][------<<<<<<Xs]');
    
    this.charExpansions.set('F', '+A<');
    this.charExpansions.set('A', '-B>');
    this.charExpansions.set('B', '>+F<-');
    this.charExpansions.set('s', 'Fs');

    //this.charExpansions.set('+', '+F');
    //this.charExpansions.set('-', '-F');

    this.charExpansions.set('Y', '[yylyyyylyyy>>>ylY]');

  
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

export default Orchids;
