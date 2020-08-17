import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
import {BoundingBox2D} from './Roads';
import Utils from './Utils';

import Mesh from './Mesh';
import { pseudoRandomBytes } from 'crypto';

var ObjMtlLoader = require('obj-mtl-loader') ;
var OBJ = require('webgl-obj-loader') ;
var fs = require('fs') ;


class PolyPlane extends Mesh {
  indices: Array<number>;
  positions: Array<number>;
  colors: Array<number>;
  normals: Array<number>;
  smoothshade : boolean;
  
  filepath: string;
  m_color:vec4;
  mesh : any;
  objMtlLoader = new ObjMtlLoader();
  m_pos:vec3;
  m_vel:vec3;
  m_angle:number;
  enabled : boolean;
  transform : mat4;

  points : Array<vec4>

  maxIdx : number;
    
  constructor(filepath : string = '') {
    super(filepath); // Call the constructor of the super class. This is required.
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();
    this.indices = new Array<number>();
    this.enabled = true;
    this.smoothshade = true;
    this.maxIdx = -1;
    this.points = new Array<vec4>()
  }

  copyPointsFrom(p : PolyPlane) {
    this.points = new Array<vec4>()
    for(let i = 0; i < p.points.length;i++) {
      let v = vec4.create()
      vec4.copy(v, p.points[i])
      this.points.push(v)
    } 
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

    let bb = new BoundingBox2D(0,0,0,0)
    bb.fromPosList(this.points)

    let range = vec2.create()
    vec2.subtract(range, bb.maxCorner, bb.minCorner)

    let maxrange = Math.max(range[0], range[1])
   // console.log("range " + range)

   let norm = vec4.fromValues(0,0,0,0)

   if(this.points.length > 2) {
    for(let k = 0; k < this.points.length; k++) {

      let p0 = k > 0 ? Utils.xyz(this.points[k - 1]) : Utils.xyz(this.points[this.points.length - 1])
      let p1 = Utils.xyz(this.points[k])
      let p2 = k < this.points.length - 1 ? Utils.xyz(this.points[k + 1]) : Utils.xyz(this.points[0])
      vec4.add(norm, norm, Utils.vec3ToVec4(Utils.calcNormal(p0,p1,p2),0))  
    }

    vec4.scale(norm, norm, this.points.length)
   }
    for(let k = 0; k < this.points.length; k++) {

      let p = this.points[k]
      pos.push(p);

      let u1 = vec2.fromValues((p[0] - bb.minCorner[0]) / range[0],(p[2] - bb.minCorner[1]) / range[1]);

      uvs.push(u1);
      col.push(this.m_color);

      let p0 = k > 0 ? Utils.xyz(this.points[k - 1]) : Utils.xyz(this.points[this.points.length - 1])
      let p1 = Utils.xyz(this.points[k])
      let p2 = k < this.points.length - 1 ? Utils.xyz(this.points[k + 1]) : Utils.xyz(this.points[0])

      // let e1 = vec3.create()
      // vec3.subtract(e1, p1, p0)
      // let e2 = vec3.create()
      // vec3.subtract(e1, p2, p1)


      //let norm = Utils.vec3ToVec4(Utils.calcNormal(p0,p1,p2),0)
      //let norm = vec4.fromValues(0,1,0,0);
      nor.push(norm);
    }
      //fan method for faces
      for(let i = 1; i < this.points.length - 1; i++) {
        this.indices.push(0);
        this.indices.push(i);
        this.indices.push(i + 1);
      }
      
      for(let i = 0; i < pos.length; i++) {
        //let transUV = this.transformUV(uvs[i][0], uvs[i][1]);
        this.uvs.push(uvs[i][0]);
        this.uvs.push(uvs[i][1]);

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

    //console.log(this.colors);


    }

  }
};

export default PolyPlane;
