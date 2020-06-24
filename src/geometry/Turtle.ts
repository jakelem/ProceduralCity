import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
var OBJ = require('webgl-obj-loader') ;

class Turtle {
  prevPosition: vec3;
  prevOrientation : vec3;
  prevDepth : number;

  position: vec3;
  orientation: vec3;
  depth : number;

  constructor() {
    this.prevPosition = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0,0);
    this.prevDepth = -1;
    this.prevOrientation = vec3.fromValues(0,0,0);

    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 0;

  }

  copyshallow(t : Turtle) {
    vec3.copy(this.prevPosition, t.prevPosition);
    vec3.copy(this.prevOrientation, t.prevOrientation);

    vec3.copy(this.position, t.position);
    vec3.copy(this.orientation, t.orientation);
    this.depth = t.depth;
    this.prevDepth = t.prevDepth;

  }
}

export default Turtle;
