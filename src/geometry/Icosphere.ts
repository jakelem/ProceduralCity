import {vec3, vec4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';

class Icosphere extends Drawable {
  buffer: ArrayBuffer;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  center: vec4;

  constructor(center: vec3, public radius: number, public subdivisions: number) {
    super(); // Call the constructor of the super class. This is required.
    this.center = vec4.fromValues(center[0], center[1], center[2], 1);
  }

  create() {
    const X = 0.525731112119133606;
    const Z = 0.850650808352039932;
    const N = 0;

    let maxIndexCount = 20 * Math.pow(4, this.subdivisions);
    let maxVertexCount = 10 * Math.pow(4, this.subdivisions) + 2;

    // Create buffers to back geometry data
    // Index data will ping pong back and forth between buffer0 and buffer1 during creation
    // All data will be in buffer0 at the end
    const buffer0 = new ArrayBuffer(
      maxIndexCount * 3 * Uint32Array.BYTES_PER_ELEMENT +
      maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT +
      maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT
    );
    const buffer1 = new ArrayBuffer(
      maxIndexCount * 3 * Uint32Array.BYTES_PER_ELEMENT
    );
    const buffers = [buffer0, buffer1];
    let b = 0;

    const indexByteOffset = 0;
    const vertexByteOffset = maxIndexCount * 3 * Uint32Array.BYTES_PER_ELEMENT;
    const normalByteOffset = vertexByteOffset;
    const positionByteOffset = vertexByteOffset + maxVertexCount * 4 * Float32Array.BYTES_PER_ELEMENT;

    // Create 3-uint buffer views into the backing buffer to represent triangles
    // The C++ analogy to this would be something like:
    // triangles[i] = reinterpret_cast<std::array<unsigned int, 3>*>(&buffer[offset]);
    let triangles: Array<Uint32Array> = new Array(20);
    let nextTriangles: Array<Uint32Array> = new Array();
    for (let i = 0; i < 20; ++i) {
      triangles[i] = new Uint32Array(buffers[b], indexByteOffset + i * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);
    }

    // Create 3-float buffer views into the backing buffer to represent positions
    let vertices: Array<vec4> = new Array(12);
    for (let i = 0; i < 12; ++i) {
      vertices[i] = <vec4> new Float32Array(buffer0, vertexByteOffset + i * 4 * Float32Array.BYTES_PER_ELEMENT, 4);
    }

    // Initialize normals for a 20-sided icosahedron
    vertices[0].set([ -X,N,Z,0 ]);
    vertices[1].set([ X,N,Z,0 ]);
    vertices[2].set([ -X,N,-Z,0 ]);
    vertices[3].set([ X,N,-Z,0 ]);
    vertices[4].set([ N,Z,X,0 ]);
    vertices[5].set([ N,Z,-X,0 ]);
    vertices[6].set([ N,-Z,X,0 ]);
    vertices[7].set([ N,-Z,-X,0 ]);
    vertices[8].set([ Z,X,N,0 ]);
    vertices[9].set([ -Z,X, N,0 ]);
    vertices[10].set([ Z,-X,N,0 ]);
    vertices[11].set([ -Z,-X,N,0 ]);

    // Initialize indices for a 20-sided icosahedron
    triangles[0].set([ 0,4,1 ]);
    triangles[1].set([ 0,9,4 ]);
    triangles[2].set([ 9,5,4 ]);
    triangles[3].set([ 4,5,8 ]);
    triangles[4].set([ 4,8,1 ]);
    triangles[5].set([ 8,10,1 ]);
    triangles[6].set([ 8,3,10 ]);
    triangles[7].set([ 5,3,8 ]);
    triangles[8].set([ 5,2,3 ]);
    triangles[9].set([ 2,7,3 ]);
    triangles[10].set([ 7,10,3 ]);
    triangles[11].set([ 7,6,10 ]);
    triangles[12].set([ 7,11,6 ]);
    triangles[13].set([ 11,0,6 ]);
    triangles[14].set([ 0,1,6 ],);
    triangles[15].set([ 6,1,10 ]);
    triangles[16].set([ 9,0,11 ]);
    triangles[17].set([ 9,11,2 ]);
    triangles[18].set([ 9,2,5 ]);
    triangles[19].set([ 7,2,11 ]);

    // This loop subdivides the icosahedron
    for (let s = 0; s < this.subdivisions; ++s) {
      b = 1 - b;
      nextTriangles.length = triangles.length * 4;
      let triangleIdx = 0;

      // edgeMap maps a pair of vertex indices to a vertex index at their midpoint
      // The function `mid` will get that midpoint vertex if it has already been created
      // or it will create the vertex and add it to the map
      let edgeMap: Map<string, number> = new Map();
      function mid(v0: number, v1: number): number {
        let key = [v0, v1].sort().join('_');
        if (!edgeMap.has(key)) {
          let midpoint = <vec4> new Float32Array(buffer0, vertexByteOffset + vertices.length * 4 * Float32Array.BYTES_PER_ELEMENT, 4);
          vec4.add(midpoint, vertices[v0], vertices[v1]);
          vec4.normalize(midpoint, midpoint);
          edgeMap.set(key, vertices.length);
          vertices.push(midpoint);
        }
        return edgeMap.get(key);
      }

      for (let t = 0; t < triangles.length; ++t) {
        let v0 = triangles[t][0];
        let v1 = triangles[t][1];
        let v2 = triangles[t][2];
        let v3 = mid(v0, v1); // Get or create a vertex between these two vertices
        let v4 = mid(v1, v2);
        let v5 = mid(v2, v0);

        let t0 = nextTriangles[triangleIdx] = new Uint32Array(buffers[b], indexByteOffset + (triangleIdx++) * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);
        let t1 = nextTriangles[triangleIdx] = new Uint32Array(buffers[b], indexByteOffset + (triangleIdx++) * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);
        let t2 = nextTriangles[triangleIdx] = new Uint32Array(buffers[b], indexByteOffset + (triangleIdx++) * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);
        let t3 = nextTriangles[triangleIdx] = new Uint32Array(buffers[b], indexByteOffset + (triangleIdx++) * 3 * Uint32Array.BYTES_PER_ELEMENT, 3);

        let triangleOffset = nextTriangles.length;
        t0.set([v0, v3, v5]);
        t1.set([v3, v4, v5]);
        t2.set([v3, v1, v4]);
        t3.set([v5, v4, v2]);
      }

      // swap buffers
      let temp = triangles;
      triangles = nextTriangles;
      nextTriangles = temp;
    }

    if (b === 1) {
      // if indices did not end up in buffer0, copy them there now
      let temp0 = new Uint32Array(buffer0, 0, 3 * triangles.length);
      let temp1 = new Uint32Array(buffer1, 0, 3 * triangles.length);
      temp0.set(temp1);
    }

    // Populate one position for each normal
    for (let i = 0; i < vertices.length; ++i) {
      let pos = <vec4> new Float32Array(buffer0, positionByteOffset + i * 4 * Float32Array.BYTES_PER_ELEMENT, 4);
      vec4.scaleAndAdd(pos, this.center, vertices[i], this.radius);
    }

    this.buffer = buffer0;
    this.indices = new Uint32Array(this.buffer, indexByteOffset, triangles.length * 3);
    this.normals = new Float32Array(this.buffer, normalByteOffset, vertices.length * 4);
    this.positions = new Float32Array(this.buffer, positionByteOffset, vertices.length * 4);

    this.generateIdx();
    this.generatePos();
    this.generateNor();

    this.count = this.indices.length;

    //console.log("ISOSPHERE VERTS NUM " + mesh.vertices.length);
    console.log("ISOSPHERE " + this.positions.length);

    console.log("ISOSPHERE NORMS NUM " + this.normals.length);
    console.log("ISOSPHERE INDICES NUM " + this.indices.length);



    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufIdx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufNor);
    gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);

    console.log(`Created icosphere with ${vertices.length} vertices`);
  }
};

export default Icosphere;
