import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';

import Mesh from './Mesh';
import { pseudoRandomBytes } from 'crypto';

var ObjMtlLoader = require('obj-mtl-loader') ;
var OBJ = require('webgl-obj-loader') ;
var fs = require('fs') ;


class LineSegment extends Drawable {
  indices: Array<number>;
  positions: Array<number>;
  normals: Array<number>;
  colors: Array<number>;
  uvs: Array<number>;

  m_color : vec4;
  p1 : vec4;
  p2 : vec4;

  maxIdx : number;
    
  constructor(filepath : string = '') {
    super();
    this.positions = new Array<number>();
    this.p1 = vec4.fromValues(0,0,0,1)
    this.p2 = vec4.fromValues(0,1,0,1)

  }

  drawMode() {
    return gl.LINES
  }

  loadMesh() {
    //console.log("loading cylinder")
    //let numPos = mesh.vertices.length / 3 * 4;
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();

    let pos = new Array<vec4>();
    let uvs = new Array<vec2>();

    let nor = new Array<vec4>();
    let col = new Array<vec4>();

    pos.push(this.p1);

    let u1 = vec2.fromValues(1.0,0.0);
    uvs.push(u1);

    pos.push(this.p2);

    let u2 = vec2.fromValues(1.0,1.0);
    uvs.push(u2);


    for(let i = 0; i < 4; i ++) {
      let norm = vec4.fromValues(0,1,0,0);
      nor.push(norm);
      col.push(this.m_color);
    }

    //fan method for faces
      this.indices.push(0);
      this.indices.push(1);
    

      for(let j = 0; j < 4; j++) {
        this.positions.push(this.p1[j]);
        this.normals.push(0);
        this.colors.push(this.m_color[j]);

      }

      for(let j = 0; j < 4; j++) {
        this.positions.push(this.p2[j]);
        this.normals.push(0);
        this.colors.push(this.m_color[j]);
      }

    /*
    console.log("NORMS size " + nor.length);
    console.log("NORMS " + nor);
    console.log("IDX " + this.indices);*/

  }


  create() {

    let norm : Float32Array = Float32Array.from(this.normals);
    let pos : Float32Array = Float32Array.from(this.positions);
    let col : Float32Array = Float32Array.from(this.colors);
    let uv : Float32Array = Float32Array.from(this.uvs);

    let idx : Uint32Array = Uint32Array.from(this.indices);

    this.generateIdx();
    this.generatePos();
    this.generateNor();
    this.generateCol();
   // this.generateUV();

    this.count = this.indices.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, norm, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);
   // gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
   // gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);


    //console.log("COUNT " + this.count);
    //console.log(this.positions);

    console.log(this.colors);

  }
};


export default LineSegment;
