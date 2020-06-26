import {vec3, vec4, mat2, mat4, vec2} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
import LSystem from './LSystem';
import Plane from './Plane';
import PolyPlane from './PolyPlane';

import LineSegment from './LineSegment';

//import {Vertex} from './HalfEdge';
import Utils from './Utils';
import { Console } from 'console';

import Turtle from './Turtle';
import { Vertex } from './HalfEdge';
var OBJ = require('webgl-obj-loader') ;
//var OBJ = require('pri') ;


class TensorField {
  angle:number
  major:vec2
  minor:vec2

  //eigenvalue ? 
  maj_l : number

  min_l : number

  constructor() {
    this.maj_l = 1
    this.min_l = 1
    this.angle = 0
    this.major = vec2.fromValues(1,0)
    this.minor = vec2.fromValues(0,1)

  }
  setMajorMinor(theta : number) {
    this.angle = theta
    this.major = vec2.fromValues(Math.cos( this.angle),Math.sin( this.angle))
    this.minor = vec2.fromValues(Math.cos(this.angle + Math.PI * 0.5),Math.sin(this.angle  + Math.PI * 0.5))

  }

  getRadialGrid(p : vec2, dir : vec2) {
    let xaxis =vec2.fromValues(1,0)
    let o = Math.sign(Utils.crossVec2(p, xaxis))
    let theta = vec2.angle(xaxis, p)
    if(o == 1) {
      theta = 2 * Math.PI - theta
    }
    
    let gtheta = Math.atan(dir[1]/dir[0])

    this.min_l = 1;//
    let cd = vec2.sqrLen(p)
    let decay = Utils.clamp(Math.exp(0.6 * -cd),0, 1)

    theta = theta * decay + gtheta * (1 - decay)
    this.setMajorMinor(theta)

  }

  getRadial(p : vec2) {
    let xaxis =vec2.fromValues(1,0)
    let o = Math.sign(Utils.crossVec2(p, xaxis))
    let theta = vec2.angle(xaxis, p)
        /*
    console.log("a " + a)
    console.log("b " + b)
    console.log("lambda " + lambda)
    console.log("theta " + Utils.radiansToDegrees(theta))
*/
    if(o == 1) {
      theta = 2 * Math.PI - theta
    }

    this.min_l = 1;//vec2.length(p)  * 0.1

    this.setMajorMinor(theta)
  }

  sampleMinor() {
    let res = vec2.create()
    vec2.copy(res, this.minor)
    return res
  }

  sampleMajor() {
    let res = vec2.create()
    vec2.copy(res, this.major)
    return res
  }

  getGrid(dir : vec2) {
    //vec2.normalize(dir, dir)
    let theta = Math.atan(dir[1]/dir[0])
    console.log("theta: "  + Utils.radiansToDegrees(theta))

    this.setMajorMinor(theta)

  }
}

class GraphTurtle extends Turtle {
  vertex : GraphVertex;
  
  constructor(vertex : GraphVertex = undefined) {
    super()
    if(vertex == undefined) {
      let v1 = vec3.create();
      vec3.copy(v1, vec3.fromValues(0,0,0));  
      this.vertex = new GraphVertex(v1);
  
    } else {
      this.vertex = vertex;
    }

  }

  copyshallow(t : GraphTurtle) {
    vec3.copy(this.prevPosition, t.prevPosition);
    vec3.copy(this.prevOrientation, t.prevOrientation);
    vec3.copy(this.position, t.position);
    vec3.copy(this.orientation, t.orientation);
    this.depth = t.depth;
    this.prevDepth = t.prevDepth;
    this.vertex = t.vertex;

  }
}


class BoundingBox2D {
  minCorner : vec2
  maxCorner : vec2

  constructor(minX : number, maxX : number, minY : number, maxY : number) {
    this.maxCorner = vec2.fromValues(maxX, maxY)
    this.minCorner = vec2.fromValues(minX, minY)


  }

  getCenter() {
    let x = this.minCorner[0] + (Math.abs(this.maxCorner[0] - this.minCorner[0])) * 0.5
    let y = this.minCorner[1] + (Math.abs(this.maxCorner[1] - this.minCorner[1])) * 0.5

    let res = vec2.fromValues(x,y)

    console.log("maxcorner " + this.maxCorner)
    console.log("mincorner " + this.minCorner)
    console.log("center corner " + res)

    return res
  }
}



class GraphVertex {
  static currId : number = 0;
  pos:vec3;
  neighbors : Set<GraphVertex>;
  id:number;
  constructor(pos : vec3) {
    this.pos = pos;
    this.neighbors = new Set<GraphVertex>()
    this.id = GraphVertex.currId;
    GraphVertex.currId+=1;
  }

  static boundingBoxFromVerts(face : Array<GraphVertex>) {
    console.log("\n")

    console.log("next face")
    let minX = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE
    let minZ = Number.MAX_VALUE
    let maxZ = -Number.MAX_VALUE

    for(let i = 0 ; i < face.length; i++) {
      console.log("vertex " + i + " " + face[i].pos)
      minX = Math.min(face[i].pos[0], minX)
      maxX = Math.max(face[i].pos[0], maxX)
      minZ = Math.min(face[i].pos[2], minZ)      
      maxZ = Math.max(face[i].pos[2], maxZ)
    }

    return new BoundingBox2D(minX, maxX, minZ, maxZ)
  }


}

class Segment {
  v1 : GraphVertex;
  v2 : GraphVertex;
  constructor(v1 : GraphVertex, v2 : GraphVertex) {
    this.v1 = v1;
    this.v2 = v2;
  }

  getIntersection(s2 : Segment) {
    let p = vec2.fromValues(this.v1.pos[0], this.v1.pos[2])
    let q = vec2.fromValues(s2.v1.pos[0], s2.v1.pos[2])

    let r = vec2.fromValues(this.v2.pos[0] - p[0], this.v2.pos[2] - p[1]);
    let s = vec2.fromValues(s2.v2.pos[0] - q[0], s2.v2.pos[2] - q[1]);

    let q_p = vec2.fromValues(q[0] - p[0], q[1] - p[1])

    let rxs = Utils.crossVec2(r, s);
    let t = Utils.crossVec2(q_p, s) / rxs
    let u = Utils.crossVec2(q_p, r) / rxs

    if(rxs !== 0 && t >= -0.0 && t <= 1  && u >= 0.0 && u <= 1) {
      return vec3.fromValues(p[0] + t * r[0], 0, p[1] + t * r[1])
    } else {
      return undefined
    }
  }
}


class Graph {

  adjList : Set<GraphVertex>

  constructor() {
    this.adjList = new Set<GraphVertex>()

  }

  addNeighbor(v1 : GraphVertex, v2 : GraphVertex) {
    this.adjList.add(v1)
    this.adjList.add(v2)

    v1.neighbors.add(v2)

  }


  removeNeighbor(v1 : GraphVertex, v2 : GraphVertex) {
    this.adjList.add(v1)
    this.adjList.add(v2)

    v1.neighbors.delete(v2)

  }
}

class Intersection {
  point : vec3;
  edge : Segment;
  constructor(point : vec3, edge : Segment) {
    this.point = point;
    this.edge = edge;

  }
}

class Roads extends LSystem {
  prevPosition: vec3;
  prevOrientation : vec3;
  prevDepth : number;
  m_plane : Plane;
  position: vec3;
  orientation: vec3;
  depth : number;
  currTurtle : GraphTurtle
  turtleStack : Array<GraphTurtle>
  
  segmentCandidates : Array<Segment>
  adjList : Set<GraphVertex>
  faces : Array<Array<GraphVertex>>
  bounds : BoundingBox2D
  constructor() {
    super()
    this.prevPosition = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0,0);
    this.prevDepth = -1;
    this.prevOrientation = vec3.fromValues(0,0,0);
    this.currTurtle = new GraphTurtle()
    this.currTurtle.position = vec3.fromValues(1,0,0);
    this.currTurtle.orientation = vec3.fromValues(0,0,1);
    
    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 0;
    this.m_plane = new Plane();
    this.m_plane.loadMesh();
    this.fullMesh = new Mesh('')
    this.iterations = 7;
    this.adjList = new Set<GraphVertex>()
    this.fillCharToAction()
    this.setAxiom()
    this.faces = new Array<Array<GraphVertex>>()
    this.bounds = new BoundingBox2D(-20,20,-20,20)
  }

  //https://mosaic.mpi-cbg.de/docs/Schneider2015.pdf

  findFaces() {
    let finishedVerts = new Set<GraphVertex>()
    let foundFaces = new Set<String>()
    this.adjList.forEach((v: GraphVertex) => {
      if(true) {
      v.neighbors.forEach((vadj : GraphVertex) => {
        let visit = new Array<GraphVertex>();
        let prevVert = v;
        let nextVert = vadj;
        visit.push(nextVert)

        let foundV = false;
        let forceStop = false;
        while(!foundV && visit.length < 20 && !forceStop) {

          if(nextVert == undefined) {
            //break
          }


          if(finishedVerts.has(nextVert)) {
            forceStop = true;
          }

          let v_p = Utils.xz(prevVert.pos);
          let vadj_p = Utils.xz(nextVert.pos);
          let prevEdge = vec2.create();
          vec2.subtract(prevEdge, vadj_p, v_p)

          let candidates = new Array()

          nextVert.neighbors.forEach((cand : GraphVertex) => {
            if(cand != prevVert) {
              candidates.push(cand)
            }
          });

          if(candidates.length > 0) {
            prevVert = nextVert
            nextVert = this.getBestFaceCandidate(nextVert,candidates,prevEdge)
          } else {
            forceStop = true;
          }

          if(nextVert == v) {
            foundV = true
          } 
          
          visit.push(nextVert)
        }

        let ccw = this.isCCW(visit)

        if(foundV && ccw) {
          let faceString = this.convertFaceToString(visit)
          if(!foundFaces.has(faceString)) {
            this.faces.push(visit)
            foundFaces.add(faceString)
          }
        }
      });
      finishedVerts.add(v)
    }
    
    });
  }

  getBestFaceCandidate(nextVert : GraphVertex, candidates : Array<GraphVertex>, prevEdge : vec2) {
    if(candidates.length > 1) {
      let mostCC = this.getMostCCW(nextVert, candidates, prevEdge)
      
      return mostCC
    } else if (candidates.length == 1){
      return candidates[0]
    } else {
      return undefined
    }

  }

  isCCW(face : Array<GraphVertex>) {
    let ccw = false
        
    if(face.length > 2) {
      let orient = 0;
      for(let i = 0; i < face.length;i++) {
        let p1 = face[i].pos
        let p2 = face[(i + 1) % face.length].pos
        orient += (p2[0] - p1[0]) * (p2[2] + p1[2])
      }
      if(orient > 0) {
        ccw = true
      }
    }
    return ccw
  }


  getMostCCW(v : GraphVertex, candidates : Array<GraphVertex>, prevEdge : vec2) {
    let v_p = Utils.xz(v.pos);
    let mostCC = undefined;
    let minA = Number.MAX_VALUE;

    let colinear = undefined;

    let leastClockwise = undefined;
    let maxA = Number.MIN_VALUE;

    for(let i = 0; i < candidates.length; i++) {
      let v_cand = Utils.xz(candidates[i].pos)
      let nextEdge = vec2.fromValues(v_cand[0] - v_p[0], v_cand[1] - v_p[1])
      let orient = Math.sign(Utils.crossVec2(prevEdge, nextEdge))
      vec2.normalize(prevEdge,prevEdge)
      vec2.normalize(nextEdge,nextEdge)

      //angle represents angle we have to rotate prevedge to get to nextedge, 
      //represents clockwise or ccw respective to orientation
      //so if orientation is -1, want the most counter clockwise rotated
      let a = Utils.radiansToDegrees(vec2.angle(prevEdge, nextEdge))
/*
      console.log("angle between " + v.id + " and " + candidates[i].id + ": " + a)
      console.log("orient between " + v.id + " and " + candidates[i].id + ": " + orient)
*/
      if(orient == -1 && maxA < a) {
        mostCC = candidates[i]
        maxA = a
      } else if(orient == 0) {
        colinear = candidates[i]
      } else if(orient == 1 && minA > a) {
        leastClockwise = candidates[i]
        minA = a
      }
    }

    if(mostCC !== undefined) {
      return mostCC
    } else if(colinear !== undefined) {
      return colinear
    } else {
      return leastClockwise
    }
  }


  convertFaceToString(face : Array<GraphVertex>) {
    let res = ''
    let minId = Number.MAX_VALUE
    let minIdInd = 0; 

    //start traversing the face at the minimum id, since same faces may have different starting indices
    for (let i = 0; i < face.length;i++) {
      if(face[i].id < minId) {
        minId = face[i].id
        minIdInd = i
      }
    }

    for(let i = minIdInd; i < minIdInd + face.length; i++) {
      res += face[i % face.length].id + ','
    }

    return res
  }

  hasOneCycle(subgraph : Array<GraphVertex>) {
    let v = subgraph.length
    let vertSet = new Set<GraphVertex>(subgraph)
    let e = 0
    subgraph.forEach((v1: GraphVertex) => {
      v1.neighbors.forEach((n : GraphVertex) => {
        if(vertSet.has(n)) {
          e += 1
        }
      })
    })

    e /= 2
    return v - e == 0
  }

  drawVertex(v1:GraphVertex) {
    let offset = vec3.fromValues(v1.pos[0], 0.01, v1.pos[2])
    let p1mesh = new Mesh('/geo/plane.obj', offset, vec3.fromValues(0.05,0.05,0.05), vec3.fromValues(0,0,0))
    p1mesh.m_color = vec4.fromValues(0.1,0.3 * (v1.id - 20),0.1,1)
    this.fullMesh.transformAndAppend(this.m_plane, p1mesh);

  }

  drawEdges() {
    let i = 0;

    this.adjList.forEach((v1: GraphVertex) => {
      v1.neighbors.forEach((v2 : GraphVertex) => {
        this.drawVertex(v1)
        this.drawVertex(v2)

        i++;
        let segVec = vec3.create()
        vec3.subtract(segVec, v2.pos, v1.pos);
        vec3.normalize(segVec,segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0,1,0), segVec)
        vec3.normalize(crossVec,crossVec);
        vec3.scale(crossVec, crossVec, 0.05)
  
        let planemesh = new PolyPlane()
        planemesh.points.push(vec4.fromValues(v1.pos[0], 0, v1.pos[2], 1))
        planemesh.points.push(vec4.fromValues(v1.pos[0] + crossVec[0], 0, v1.pos[2] + crossVec[2], 1))
        planemesh.points.push(vec4.fromValues(v2.pos[0] + crossVec[0], 0, v2.pos[2] + crossVec[2], 1))
        planemesh.points.push(vec4.fromValues(v2.pos[0], 0, v2.pos[2], 1))

        //planemesh.m_color = vec4.fromValues(9.5,0.04 * i,0.5,1)
        planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
        this.fullMesh.transformAndAppend(planemesh, planemesh);
  
      });
    });

  }


  drawFaces() {
    for(let i = 0; i < this.faces.length;i++) {
      let face = this.faces[i]
      let planemesh = new PolyPlane()
      console.log("FACE " + i)
      for(let j = 0; j < face.length; j++) {
        let point = Utils.vec3ToVec4(face[j].pos,1);
        let point2 = Utils.vec3ToVec4(face[(j + 1) % face.length].pos,1);

        point[1] = 0.1   + 0.03;
        planemesh.points.push(point)
        console.log(face[j].id)

        let pl = new PolyPlane()
        
        let p3 = vec4.create()
        vec4.copy(p3, point2)
        p3[1] = 0.8
        let p4 = vec4.create()
        vec4.copy(p4, point)
        p4[1] = 0.8

        pl.points.push(point)
        pl.points.push(point2)
        pl.points.push(p3)
        pl.points.push(p4)
        pl.m_color = Utils.randomColor()
        pl.loadMesh();
        //this.fullMesh.transformAndAppend(pl, pl);
      }

      planemesh.m_color = Utils.randomColor()
      planemesh.loadMesh();
      this.fullMesh.transformAndAppend(planemesh, planemesh);

  }
}

  fillMesh() {
    //this.pruneAdjList()
    //console.log
    this.drawEdges()
    console.log("FUllmesh" + this.fullMesh.positions)
    this.findFaces()
    this.drawFaces()
  }


  addNeighbor(v1 : GraphVertex, v2 : GraphVertex) {
    this.adjList.add(v1)
    this.adjList.add(v2)

    v1.neighbors.add(v2)
    v2.neighbors.add(v1)

  }


  removeNeighbor(v1 : GraphVertex, v2 : GraphVertex) {
    this.adjList.add(v1)
    this.adjList.add(v2)

    v1.neighbors.delete(v2)
    v2.neighbors.delete(v1)

  }

  splitEdge(v1 : GraphVertex, v2 : GraphVertex, midpt : GraphVertex) {
    this.addNeighbor(v1, midpt)
    this.addNeighbor(midpt, v2)

    this.removeNeighbor(v1, v2)

  }

  getClosestVertex(vert : GraphVertex) {
    let minDist = Number.MAX_VALUE
    let closestVert : GraphVertex = undefined

    this.adjList.forEach((v1: GraphVertex) => {
      if (v1 !== vert) {
        let dist = vec3.dist(vert.pos, v1.pos) 
        if(dist < minDist) {
          closestVert = v1
          minDist = dist
        }
      }
    });
    return closestVert
  }


  checkEdgeOverlap(s1: Segment) : Intersection {
    let foundIsect : Intersection = undefined
    let minDist = Number.MAX_VALUE
    this.adjList.forEach((v1: GraphVertex) => {
      if(v1 !== s1.v1) { // prevent self intersection if edges share vertex
      v1.neighbors.forEach((v2 : GraphVertex) => {
        if(v2 !== s1.v1){
        let s2 = new Segment(v1, v2);
        let isect = s1.getIntersection(s2)
        if(isect !== undefined) {
          let dist = vec3.distance(s1.v1.pos, isect)

          if(minDist > dist) {
            foundIsect = new Intersection(isect, s2)
            minDist = dist
          }
        }
      }
      });
    }
    });

    return foundIsect
  }


  removeFromAdjList(v: GraphVertex ) {
    v.neighbors.forEach((n: GraphVertex) => {
      n.neighbors.delete(v)
    })
    this.adjList.delete(v);
  }

  //iteratively removes vertices of degree 1 or less
  pruneAdjList() {
    let needs_pruning = true;

    while(needs_pruning) {
      needs_pruning = false
      let toRemove = new Array<GraphVertex>()
      this.adjList.forEach((v1: GraphVertex) => {
        if(v1.neighbors.size <= 1) {
          needs_pruning = true
          toRemove.push(v1)
        }
      })

      for(let i = 0; i < toRemove.length; i++) {
        this.removeFromAdjList(toRemove[i])
      }
    }
  }

  pushTurtle() {
    this.turtleStack.push(this.currTurtle);
    let prevTurtle = this.currTurtle;
    this.currTurtle = new GraphTurtle();
    this.currTurtle.copyshallow(prevTurtle);

  }

  popTurtle() {
    this.currTurtle = this.turtleStack.pop();
    //console.log(this.currTurtle);

  }



  solveRK4(p : vec2, dir :vec2, major : boolean) {
    let res = vec2.create()

    let tensor = new TensorField()
    let sp = vec2.create()
    vec2.copy(sp,p)

    for(let i = 0 ; i < 4; i++) {
      let div = (i == 0 || i == 3) ? 6 : 3

      tensor.getGrid(dir)
      let k = major ? tensor.sampleMajor():tensor.sampleMinor()
      vec2.scaleAndAdd(res, res, k, 1/div)

      let factor = (i < 2) ? 0.5 : 1
      vec2.scaleAndAdd(sp,p, k,factor)

    }
    return res
  }

  getNextSegments(segment : Segment) {
    let res = new Array<Segment>()
    let p1 = Utils.xz(segment.v1.pos)
    let p2 = Utils.xz(segment.v2.pos)
    let dir = vec2.create()
    vec2.subtract(dir, p2, p1)
    vec2.normalize(dir,dir)


    dir = vec2.fromValues(1,0)

    let inp  = vec2.create()
    vec2.scale(inp, p2, 0.05)
    let h1 = Utils.perlin(inp)
    let h2 = Utils.perlin(vec2.fromValues(inp[0] + 0.01,inp[1]))
    let h3 = Utils.perlin(vec2.fromValues(inp[0],inp[1] + 0.01))

    let dh = h2 - h1
    let dhz = h3 - h1

    let grad = vec2.fromValues(dh / 0.01, dhz / 0.01)
    dir = grad
    console.log("grad " + grad)
    let tensor = new TensorField()
    let radCenter = vec2.fromValues(0,0.0)

    let poff = vec2.create()
    vec2.subtract(poff, p2, radCenter)
   // tensor.getRadial(p2)
   tensor.getGrid(grad)

    let maj = tensor.major
    let min = tensor.minor

    maj = this.solveRK4(poff, dir , true)
   min = this.solveRK4(poff, dir, false)


   let centerdist = vec2.length(poff)
   let decay = Math.exp(0.4 * - centerdist)
   // decay = Utils.clamp(centerdist * 0.4,0,1)
   decay = Utils.clamp(3 - centerdist * 0.5, 0, 3)
   
  // vec2.scaleAndAdd(maj, tensor.major, maj, decay)
  // vec2.scaleAndAdd(min, tensor.minor, min, decay)


    console.log("decay " + decay)
  
  // vec2.lerp(maj, maj, tensor.major, 1)
  // vec2.lerp(min, min, tensor.minor, 1)


  //vec2.scaleAndAdd(maj, tensor.major, maj, decay)
  //vec2.scaleAndAdd(min, tensor.minor, min, decay)

    let maj_step = vec3.fromValues(maj[0], 0, maj[1])
    let min_step = vec3.fromValues(min[0], 0, min[1])

    let v_maj = vec3.create();
    vec3.scaleAndAdd(v_maj,segment.v2.pos,maj_step, 1.2)
    let vert_maj = new GraphVertex(v_maj)

    let v_min = vec3.create();
    vec3.scaleAndAdd(v_min,segment.v2.pos,min_step, 1.2)
    let vert_min = new GraphVertex(v_min)


    let s1 = new Segment(segment.v2, vert_maj)
    let s2 = new Segment(segment.v2, vert_min)

    res.push(s1)
    res.push(s2)

    return res
  }


  expandSegments() {
    let i = 0
    while(this.segmentCandidates.length > 0 && i < 1400) {
      i++
      let segment = this.segmentCandidates.shift()

      if(!this.checkLocalConstraints(segment)) {
        continue
      }

      let fixed_segment = this.checkSegmentConstraints(segment)
      this.addNeighbor(fixed_segment.v1, fixed_segment.v2)

      if(fixed_segment.v2 == segment.v2) {
        let candidates = this.getNextSegments(segment)

        for(let i = 0; i < candidates.length; i++) {
          this.segmentCandidates.push(candidates[i])
  
        }
      }
    }
  }


  advanceTurtleTensor(major : boolean) {
    //let mesh = new Mesh('/geo/plane.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(1,1,1), vec3.clone(this.currTurtle.orientation))
    //this.meshes.push(mesh);
    console.log("curr vert id " + GraphVertex.currId)
    let rotMat = mat4.create();


    mat4.rotateY(rotMat, rotMat, this.currTurtle.orientation[1] * Math.PI / 180)

    let step = vec3.fromValues(0,0,4);
    vec3.transformMat4(step, step, rotMat);

    let v1 = vec3.create();
    vec3.copy(v1, this.currTurtle.position);  
    let vert1 = this.currTurtle.vertex;

    let p = Utils.xz(this.currTurtle.position)

    let tensor = new TensorField()

    vec2.normalize(p,p)
    tensor.getGrid(p)

    //let td = vec2.fromValues(1,0)
    //vec2.transformMat2(td,td,mat)
    //step = vec3.fromValues(td[0], 0, td[1])


    if(major) {
      step = vec3.fromValues(tensor.major[0], 0, tensor.major[1])

    } else {
      step = vec3.fromValues(tensor.minor[0], 0, tensor.minor[1])
    }
    //console.log("step " + step)
    vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, 1);
    //console.log("this.currTurtle.position " + this.currTurtle.position)

    let v2 = vec3.create();
    vec3.copy(v2, this.currTurtle.position);
    let vert2 = new GraphVertex(v2);

    let dir = vec3.create();
    vec3.subtract(dir, vert2.pos, vert1.pos)
    vec3.normalize(dir, dir);
    //vec3.scaleAndAdd(vert1.pos, vert1.pos, dir, 0.2);
    let seg = new Segment(vert1, vert2);
    seg = this.checkSegmentConstraints(seg)

    vec3.copy(this.currTurtle.position, seg.v2.pos)
    this.addNeighbor(seg.v1, seg.v2)
    this.currTurtle.vertex = seg.v2;

  }


  outOfBounds(v : vec3) {
    return v[0] > this.bounds.maxCorner[0] || v[0] < this.bounds.minCorner[0] || v[2] > this.bounds.maxCorner[1] || v[2] < this.bounds.minCorner[1]
  }

  checkLocalConstraints(seg : Segment) {
    if(this.outOfBounds(seg.v1.pos) || this.outOfBounds(seg.v2.pos)) {
      return false
    }

    return true
  }
  //modifies given segment to 
  checkSegmentConstraints(seg : Segment) {
    let edge_isect = this.checkEdgeOverlap(seg)
    let vert2 = seg.v2

    let tol = 0.7
    //if intersects with an edge, 
    if(edge_isect !== undefined) {
      vec3.copy(vert2.pos, edge_isect.point)
      let closest = this.getClosestVertex(vert2)
      if(vec3.dist(closest.pos,vert2.pos) < tol) {
        vert2 = closest
      }  else {
        this.splitEdge(edge_isect.edge.v1, edge_isect.edge.v2, vert2)  
      }
    } else {
      let closest = this.getClosestVertex(vert2)
      if(closest !== undefined && vec3.dist(closest.pos, vert2.pos) < tol) {
        vert2 = closest
      }
    }

    return new Segment(seg.v1, vert2)
  }


  fillCharExpansions() {
  //  this.charExpansions.set('X', 'F!!!!F!F!!F!!!!F');
    this.charExpansions.set('X', '[DDX]F[FFX][DXF]');
  }

  setAxiom() {
    this.axiom = "X";
    this.segmentCandidates = new Array<Segment>()
    let v1 = vec3.fromValues(-9,0,-9)
    let vert1 = new GraphVertex(v1)

    let v2 = vec3.fromValues(-9,0,-8)
    let vert2 = new GraphVertex(v2)
    let seg = new Segment(vert1,vert2)

    this.segmentCandidates.push(seg)
  }

  fillCharToAction() {
    this.charToAction.set('F', () => {
      this.advanceTurtleTensor(false);
    });
    this.charToAction.set('D', () => {
      this.advanceTurtleTensor(true);
    });

    this.charToAction.set('>', () => {
      this.rotateTurtleYBy(-5);
    });


    this.charToAction.set('.', () => {
      this.rotateTurtleYBy(5);
    });

    this.charToAction.set('!', () => {
      this.rotateTurtleYBy(30);
    });

    this.charToAction.set('9', () => {
      this.rotateTurtleYBy(90);
    });

    this.charToAction.set('[', () => {
      this.pushTurtle();
    });

    this.charToAction.set(']', () => {
      this.popTurtle();
    });

  }


}

export {Roads, BoundingBox2D, GraphVertex};
