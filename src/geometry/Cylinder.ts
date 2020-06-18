import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';

import Mesh from './Mesh';
import { pseudoRandomBytes } from 'crypto';

var ObjMtlLoader = require('obj-mtl-loader') ;
var OBJ = require('webgl-obj-loader') ;
var fs = require('fs') ;


class Cylinder extends Mesh {
  indices: Array<number>;
  positions: Array<number>;
  colors: Array<number>;
  normals: Array<number>;
  smoothshade : boolean;
  
  face_centers: Array<vec3>;
  face_scales: Array<vec3>;
  face_rotates: Array<vec3>;

  filepath: string;
  m_color:vec4;
  mesh : any;
  objMtlLoader = new ObjMtlLoader();
  m_pos:vec3;
  m_vel:vec3;
  m_angle:number;
  enabled : boolean;
  transform : mat4;

  maxIdx : number;
    
  constructor(filepath : string = '') {
    super(filepath); // Call the constructor of the super class. This is required.
    this.face_centers = new Array<vec3>(2);
    this.face_scales = new Array<vec3>(2);
    this.face_rotates = new Array<vec3>(2);
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();
    this.indices = new Array<number>();
    this.enabled = true;
    this.smoothshade = true;
    this.maxIdx = -1;
  }

  assignFaceCenters(f1 : vec3, f2 : vec3) {
    this.face_centers[0] = vec3.clone(f1);
    this.face_centers[1] = vec3.clone(f2);

  }

  assignFaceRotations(f1 : vec3, f2 : vec3) {
    this.face_rotates[0] = vec3.fromValues(f1[0],0,f1[2]);
    this.face_rotates[1] = vec3.fromValues(f2[0],0,f2[2]);

  }

  assignFaceScales(f1 : vec3, f2 : vec3) {
    this.face_scales[0] = f1;
    this.face_scales[1] = f2;

  }
 

  assignFaceScaleUniform(f1 : number, f2 : number) {
    this.face_scales[0] = vec3.fromValues(f1,1,f1);
    this.face_scales[1] = vec3.fromValues(f2,1,f2);

  }

  loadMesh() {
    //console.log("loading cylinder")
    //let numPos = mesh.vertices.length / 3 * 4;
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();
    let subdivs = 20;

    let pos = new Array<vec4>();
    let nor = new Array<vec4>();
    let col = new Array<vec4>();

    let r = Math.random();
    let g = Math.random();
    let b = Math.random();


    //face1
    for(let face = 0; face < 2; face++) {
      for(let i = 0; i < subdivs; i++) {
        let transMat = mat4.create();
        mat4.translate(transMat, transMat, vec3.fromValues(this.face_centers[face][0], 
          this.face_centers[face][1], this.face_centers[face][2]));
        
        mat4.rotateX(transMat, transMat, this.face_rotates[face][0] * Math.PI / 180);
        mat4.rotateZ(transMat, transMat, this.face_rotates[face][2] * Math.PI / 180);
        mat4.scale(transMat, transMat, this.face_scales[face])

        let rad = 2 * i / subdivs * Math.PI;
        let norm = vec4.fromValues(0,1,0,0);
        let p1 = vec4.fromValues(Math.sin(rad), 0, Math.cos(rad),1);

        vec4.transformMat4(p1, p1, transMat);

        pos.push(p1);
        nor.push(norm);
        col.push(this.m_color);

      }
    }
 
    //fan method for faces
    for(let face = 0; face < 2; face++) {
      for(let i = 1; i < subdivs - 1;i++) {
        this.indices.push(0 + subdivs * face);
        this.indices.push(i + subdivs * face);
        this.indices.push(i + 1 + subdivs * face);
      }
    }

    let initIdx = 2 * subdivs;
    for(let i = 0; i < subdivs; i++) {
      let fIdx = new Array<number>(4);
      fIdx[0] = i;
      fIdx[1] = (i + 1) % subdivs;
      fIdx[2] = (i + 1) % subdivs + subdivs;
      fIdx[3] = i + subdivs;
  
      let debugCol = vec4.fromValues(i / (subdivs + 1), i / (subdivs + 1), i / (subdivs + 1), 1);
      for(let v = 0; v < 4; v++) {
        let e1 = vec4.create();
        let e2 = vec4.create();
        let norm = vec3.create();
        vec4.subtract(e1, pos[fIdx[(v+1) % 4]], pos[fIdx[v]]);
        vec4.subtract(e2, pos[fIdx[(v+2) % 4]], pos[fIdx[(v+1) % 4]]);
        vec3.cross(norm, vec3.fromValues(e1[0], e1[1], e1[2]), vec3.fromValues(e2[0], e2[1], e2[2]))
        vec3.normalize(norm, norm);
  
        pos.push(pos[fIdx[v]]);
        nor.push(vec4.fromValues(norm[0], norm[1], norm[2], 0));
        col.push(this.m_color);
        //debugCol = vec4.fromValues(v / 4, v % 2,0, 1);
        //debugCol = vec4.fromValues(norm[0], norm[1], norm[2], 1);
        //col.push(debugCol);

      }

      for(let off = 0; off < 2; off++) {
        this.indices.push(initIdx);
        this.indices.push(initIdx + off + 1);
        this.indices.push(initIdx + off + 2);
  
      }
      
      initIdx += 4;
    }


    //normal of last face on hull is adjacent to first face

    if(this.smoothshade) {
      let start = 2 * subdivs;

      let prevNor = nor[nor.length - 1];
      let firstNor = nor[start];

      for(let i = start; i < 6 * subdivs; i+=4) {
        let currNor = vec4.clone(nor[i]);
        let nextNor = vec4.create();

        if(i < 6 * subdivs - 4) {
          nextNor = nor[i + 4];
        } else {
          nextNor = firstNor;
        }

        let avgNorL = vec4.create();
        vec4.lerp(avgNorL, currNor, prevNor, 0.5);
        vec4.normalize(avgNorL, avgNorL);
        let avgNorR = vec4.create();
        vec4.lerp(avgNorR, currNor, nextNor, 0.5);
        vec4.normalize(avgNorR, avgNorR);

        nor[i] =avgNorL;
        nor[i + 1] =avgNorR;
        nor[i + 2] = avgNorR;
        nor[i + 3] =avgNorL;

        prevNor = currNor;
      }

    }


    for(let i = 0; i < pos.length; i++) {
      for(let j = 0; j < 4; j++) {
        this.positions.push(pos[i][j]);
        this.normals.push(nor[i][j]);
        this.colors.push(col[i][j]);

      }
    }

    /*
    console.log("NORMS size " + nor.length);

    console.log("NORMS " + nor);
    console.log("IDX " + this.indices);*/

  }


  create() {
    if(this.enabled) {

    let norm : Float32Array = Float32Array.from(this.normals);
    let pos : Float32Array = Float32Array.from(this.positions);
    let col : Float32Array = Float32Array.from(this.colors);
    let idx : Uint32Array = Uint32Array.from(this.indices);

    this.generateIdx();
    this.generatePos();
    this.generateNor();
    this.generateCol();

    this.count = this.indices.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, norm, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);


    //console.log("COUNT " + this.count);
    //console.log(this.positions);

    //console.log(this.indices);


    }

  }
};

export default Cylinder;
