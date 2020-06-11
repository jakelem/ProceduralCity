import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

var ObjMtlLoader = require('obj-mtl-loader') ;
var OBJ = require('webgl-obj-loader') ;
var fs = require('fs') ;


class Mesh extends Drawable {
  indices: Array<number>;
  positions: Array<number>;
  colors: Array<number>;
  normals: Array<number>;
  center: vec4;
  scale: vec3;
  rotate: vec3;
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
    
  constructor(filepath: string, center: vec3 = vec3.fromValues(0,0,0), 
  scale:vec3 = vec3.fromValues(1,1,1), rotate:vec3 = vec3.fromValues(0,0,0), col:vec4 = vec4.fromValues(25,86,107,255)) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
    this.filepath = filepath;
    this.scale = scale;
    this.rotate = rotate;
    this.m_color = col;
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();
    this.indices = new Array<number>();
    this.enabled = true;
    this.maxIdx = -1;
    this.getOverallTransformation();

  }
  
  getOverallTransformation() {
    this.transform = mat4.create();
    mat4.translate(this.transform, this.transform, vec3.fromValues(this.center[0], this.center[1], this.center[2]));
    mat4.rotateX(this.transform, this.transform, this.rotate[0] * Math.PI / 180);
    mat4.rotateY(this.transform, this.transform, this.rotate[1] * Math.PI / 180);
    mat4.rotateZ(this.transform, this.transform, this.rotate[2] * Math.PI / 180);
    mat4.scale(this.transform, this.transform, this.scale);

  }


  exportObj() {
    let output = '';

    for(let i = 0 ; i < this.positions.length; i += 4) {
      output += 'v ' + this.positions[i] + ' ' + this.positions[i + 1] + ' ' + this.positions[i + 2] + '\n';
    }

    for(let i = 0 ; i < this.normals.length; i += 4) {
      output += 'vn ' + this.normals[i] + ' ' + this.normals[i + 1] + ' ' + this.normals[i + 2] + '\n';
    }

    for(let i = 0 ; i < this.indices.length; i += 3) {
      output += 'f';
      for(let j = 0; j < 3; j ++) {
        output += ' ' + (this.indices[i + j] + 1) + '//' + (this.indices[i + j] + 1);
      }
      output += '\n';

    }

    console.log(output);
    return output;
  }

  loadAndCreate() {
    let f = (meshes: any) => {
      this.loadMesh(meshes.mesh);
      this.create();
    }
    //console.log("FILEPATH " + this.filepath);
    OBJ.downloadMeshes({
      'mesh': this.filepath,
    }, f);
  }

  load() {
    OBJ.downloadMeshes({
      'mesh': this.filepath,
    }, (meshes: any) => {
      this.loadMesh(meshes.mesh);
    });
  }

  transformAndAppend(mesh: Mesh, trans : mat4, col : vec4 = vec4.fromValues(0.5,0.5,0.5, 1)) {
    //console.log(numPos);
    let v = 0;
    for(let i = 0; i < mesh.positions.length; i += 4) {
      let pos = vec4.fromValues(mesh.positions[i], mesh.positions[i+1], mesh.positions[i+2], mesh.positions[i+3]);
      let nor = vec4.fromValues(mesh.normals[i], mesh.normals[i+1], mesh.normals[i+2],  mesh.normals[i+3]);
      vec4.transformMat4(pos, pos, trans);
      vec4.transformMat4(nor, nor, trans);
      vec4.normalize(nor, nor);
      
      for(let j = 0; j < 4; j+=1) { 
        this.positions.push(pos[j]);
        this.normals.push(nor[j]);
        this.colors.push(col[j]);

      }
      v += 4;
    }

    //this.indices = new Array<number>(mesh.indices.length);
    let initIdx = this.maxIdx + 1;
    for(let i = 0; i < mesh.indices.length; i += 1) {
      let idx = mesh.indices[i] + initIdx;
      this.indices.push(idx);
      this.maxIdx = Math.max(idx, this.maxIdx);
    }
  }

  //parents this mesh's transformation to the input mesh's
  addPrefabMeshAsChild(mesh: Mesh) {
    this.transformAndAppend(mesh, this.transform);
  }


  //preserves the transformation of the input mesh
  addPrefabMesh(mesh: Mesh) {
    this.transformAndAppend(mesh, mesh.transform);
  }


  fromPrefabMesh(mesh: Mesh) {
    this.positions = new Array<number>();
    this.normals = new Array<number>();
    this.colors = new Array<number>();
    this.indices = new Array<number>();
    this.addPrefabMeshAsChild(mesh);
  }


  loadMesh(mesh: any) {
    let numPos = mesh.vertices.length / 3 * 4;
    this.positions = new Array<number>(numPos);
    this.normals = new Array<number>(numPos);
    this.colors = new Array<number>(numPos);

    let v = 0;
    let col1 = vec4.fromValues(25,86,107,255);
    vec4.scale(col1,col1,1/255);
    let col2 = vec4.fromValues(176,182,158,255);
    vec4.scale(col2,col2,1/255);

    for(let i = 0; i < mesh.vertices.length; i += 3) {
      let pos = vec4.fromValues(mesh.vertices[i], mesh.vertices[i+1], mesh.vertices[i+2], 1);
      let nor = vec4.fromValues(mesh.vertexNormals[i], mesh.vertexNormals[i+1], mesh.vertexNormals[i+2], 0);
      let col = this.m_color;

      for(let j = 0; j < 4; j+=1) { 
        this.positions[v+j] = pos[j];
        this.normals[v+j] = nor[j];
        this.colors[v+j] = col[j];

      }

      v += 4;
    }

    this.indices = new Array<number>(mesh.indices.length);

    for(let i = 0; i < mesh.indices.length; i += 1) {
      this.indices[i] = mesh.indices[i];
    }

  }

  create() {
    if(this.enabled) {

    //this.load();
    //console.log("MESH VERTS NUM " + this.positions.length);
    //console.log("MESH NORMS NUM " + this.normals.length);
    //console.log("MESH INDICES NUM " + this.indices.length);
    //console.log("MESH positions " + this.indices);
    //console.log("MESH colors " + this.colors);

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

export default Mesh;
