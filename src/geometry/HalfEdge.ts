import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
import Utils from './Utils';

var OBJ = require('webgl-obj-loader') ;


class Vertex {
  static currId : number = 0;
  pos:vec3;
  hes : Array<HalfEdge>;
  id:number;
  constructor(pos : vec3, h : HalfEdge) {
    this.pos = pos;
    this.hes = new Array<HalfEdge>()
    this.hes.push(h);
    this.id = Vertex.currId;
    Vertex.currId+=1;
  }

}

class Face {
  he : HalfEdge;
  color : vec4;
  constructor(h : HalfEdge, col : vec4 = undefined) {
    this.he = h;
    if(col !== undefined) {
      this.color = col;
    } else {
      this.color = Utils.randomColor();
    }
  }

}

class HalfEdge {

  sym : HalfEdge;
  next : HalfEdge;

  face : Face;
  vert : Vertex;

  constructor(f : Face, v : Vertex, n : HalfEdge, s : HalfEdge) {
    this.sym = s;
    this.next = n;
    this.face = f;
    this.vert = v;

    if(v !== undefined) {
      this.vert.hes.push(this);
    }

    if(f !== undefined) {
      this.face.he = this;
    }
  }

}

class HalfEdgeMesh extends Drawable {
  halfEdges : Array<HalfEdge>
  vertices : Array<Vertex>
  faces : Array<Face>

  indices: Array<number>;
  positions: Array<number>;
  colors: Array<number>;
  normals: Array<number>;
  uvs : Array<number>;

  constructor() {
    super();
    this.halfEdges = new Array<HalfEdge>();
    this.vertices = new Array<Vertex>();
    this.faces = new Array<Face>();

  }


  loadHeVertData(currHe : HalfEdge) {
    let p1 = currHe.vert.pos;        
    let p2 = currHe.next.vert.pos;
    let p3 = currHe.sym.vert.pos;
    let e1 = vec3.create();
    vec3.subtract(e1, p3, p1);
    let e2 = vec3.create();
    vec3.subtract(e2, p2, p1);
    let norm = vec3.create();
    vec3.cross(norm, e1, e2);

    for(let i = 0; i < 3; i++) {
      this.positions.push(currHe.vert.pos[i]);
      this.normals.push(norm[i]);
      this.colors.push(currHe.face.color[i]);
    }

    //w coord in homogenized vec4
    this.positions.push(1);
    this.normals.push(0);
    this.colors.push(1);
    
  }

  createEdgeTo(pos : vec3, prevVert: Vertex) {
    let vert = new Vertex(pos, undefined);
    let he = new HalfEdge(undefined, vert, undefined,undefined)
    let sym = new HalfEdge(undefined, prevVert, undefined, he)
    he.sym = sym;

    for(let i = 0; i < this.vertices.length; i++) {
      let dist = vec3.distance(this.vertices[i].pos, vert.pos)
      if(dist <= 1) {
        let nextHe = new HalfEdge(undefined, this.vertices[i], undefined,undefined)
        break
      }
    }
  }
  createPlane() {
    this.faces = new Array<Face>();
    this.faces.push(new Face(undefined))

    this.vertices = new Array<Vertex>();
    this.vertices.push(new Vertex(vec3.fromValues(0.5,0,0.5), undefined))
    
    this.vertices.push(new Vertex(vec3.fromValues(1.0,0,-0.5), undefined))
    this.vertices.push(new Vertex(vec3.fromValues(-0.5,0,-0.5), undefined))
    this.vertices.push(new Vertex(vec3.fromValues(-0.5,0,0.5), undefined))

    this.halfEdges.push(new HalfEdge(this.faces[0], this.vertices[1], undefined, undefined));
    this.halfEdges.push(new HalfEdge(this.faces[0], this.vertices[2], undefined, undefined));
    this.halfEdges.push(new HalfEdge(this.faces[0], this.vertices[3], undefined, undefined));
    this.halfEdges.push(new HalfEdge(this.faces[0], this.vertices[0], undefined, undefined));

    this.halfEdges.push(new HalfEdge(undefined, this.vertices[1], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[2], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[3], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[0], undefined, undefined));

    this.halfEdges.push(new HalfEdge(undefined, this.vertices[0], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[1], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[2], undefined, undefined));
    this.halfEdges.push(new HalfEdge(undefined, this.vertices[3], undefined, undefined));

    this.halfEdges[0].next = this.halfEdges[1];
    this.halfEdges[1].next = this.halfEdges[2];
    this.halfEdges[2].next = this.halfEdges[3];
    this.halfEdges[3].next = this.halfEdges[0];

    this.halfEdges[0].sym = this.halfEdges[4];
    this.halfEdges[1].sym = this.halfEdges[5];
    this.halfEdges[2].sym = this.halfEdges[6];
    this.halfEdges[3].sym = this.halfEdges[7];

  }

  loadMesh() {
    this.normals = new Array<number>();
    this.positions = new Array<number>();
    this.colors = new Array<number>();
    this.uvs = new Array<number>();
    this.indices = new Array<number>();

    let initInd = 0;
    for(let i = 0; i < this.faces.length; i++) {
      let currFace = this.faces[i];
      let vertCount = 0;

      for(let currHe = currFace.he; currHe.next != currFace.he; currHe = currHe.next) {
        this.loadHeVertData(currHe);
        vertCount++;
        if(currHe.next.next == currFace.he) {
          this.loadHeVertData(currHe.next);
          vertCount++;
        }
      }

      for(let j = initInd; i + 2 < initInd + vertCount; i++) {
        this.indices.push(initInd);
        this.indices.push(i + 1);
        this.indices.push(i + 2);

      }
      initInd += vertCount;
    }
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
    this.generateUV();


    this.count = idx.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, norm, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufCol);
    gl.bufferData(gl.ARRAY_BUFFER, col, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufUV);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);

  }
};

export {HalfEdge, Face, Vertex, HalfEdgeMesh};
