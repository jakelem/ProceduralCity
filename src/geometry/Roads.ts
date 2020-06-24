import {vec3, vec4, mat4, vec2} from 'gl-matrix';
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
var OBJ = require('webgl-obj-loader') ;


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
      console.log("YES")
      let res =vec3.fromValues(p[0] + t * r[0], 0, p[1] + t * r[1]);
      let res2 =vec3.fromValues(q[0] + u * s[0], 0, q[1] + u * s[1]);
      console.log("res" + res)
      console.log("res" + res2)

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

  adjList : Set<GraphVertex>
  faces : Array<Array<GraphVertex>>

  constructor() {
    super()
    this.prevPosition = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0,0);
    this.prevDepth = -1;
    this.prevOrientation = vec3.fromValues(0,0,0);
    this.currTurtle = new GraphTurtle()
    this.currTurtle.position = vec3.fromValues(0,0,0);
    this.currTurtle.orientation = vec3.fromValues(0,0,1);
    
    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 0;
    this.m_plane = new Plane();
    this.m_plane.loadMesh();
    this.fullMesh = new Mesh('')
    this.iterations = 3;
    this.adjList = new Set<GraphVertex>()
    this.fillCharToAction()
    this.faces = new Array<Array<GraphVertex>>()
  }

  //https://mosaic.mpi-cbg.de/docs/Schneider2015.pdf

  findFaces() {
    console.log("NUMVERTS " + this.adjList.size)
    let finishedVerts = new Set<GraphVertex>()
    let foundFaces = new Set<String>()
    this.adjList.forEach((v: GraphVertex) => {
      if(true) {
      console.log("V NEIGHBORS NUM " + v.neighbors.size)
      v.neighbors.forEach((vadj : GraphVertex) => {
        console.log("V NEIGHBOR " + vadj.id)

        let visit = new Array<GraphVertex>();
        let foundV = false;
        let prevVert = v;
        let nextVert = vadj;
        visit.push(nextVert)
        let forceStop = false;
        while(!foundV && visit.length < 20 && !forceStop) {
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

          if(candidates.length > 1) {
            let mostCC = this.getMostCC(nextVert, candidates, prevEdge)
            prevVert = nextVert
            nextVert = mostCC
  
          } else if (candidates.length == 1){
           // console.log("Only one candidate for " + prevVert.id + " " +  candidates[0].id)
            prevVert = nextVert
            nextVert = candidates[0]
          } else {
            //console.log("NO CANDIDATES")
            forceStop = true;
          }

          if(nextVert == v) {
            foundV = true
          } 
          
          visit.push(nextVert)
        }

        let ccw = false
        
        if(visit.length > 2) {
          let orient = 0;
          for(let i = 0; i < visit.length;i++) {
            let p1 = visit[i].pos
            let p2 = visit[(i + 1) % visit.length].pos
            orient += (p2[0] - p1[0]) * (p2[2] + p1[2])
          }
          if(orient > 0) {
            ccw = true
          }
        }

        /*
        if(visit.length > 2) {
          console.log(visit[0].id)
          let a = vec2.create()
          vec2.subtract(a, Utils.xz(visit[1].pos), Utils.xz(visit[0].pos))
          let b = vec2.create()
          vec2.subtract(b, Utils.xz(visit[2].pos), Utils.xz(visit[1].pos))
          let orient = Math.sign(Utils.crossVec2(a, b))
          console.log("ORIENT" + orient)
          console.log("a" + visit[0].id + " " + visit[1].id )
          console.log("b" + visit[1].id + " " + visit[2].id )
          console.log("b" + b)

          if (orient <= 0) {
            ccw = true
          }
        }*/

        if(foundV && ccw) {
          let faceString = this.convertFaceToString(visit)
          if(!foundFaces.has(faceString)) {
            console.log('faceString ' + faceString)

            //if(this.hasOneCycle(visit)) {
              this.faces.push(visit)
              foundFaces.add(faceString)
            //}
          }
        }
      });
      finishedVerts.add(v)
    }
    
    });
  }


  getMostCC(v : GraphVertex, candidates : Array<GraphVertex>, prevEdge : vec2) {
   // console.log("gettingmostcc")
    let v_p = Utils.xz(v.pos);
    let mostCC = undefined;
    let minA = Number.MAX_VALUE;

    let colinear = undefined;

    let leastClockwise = undefined;
    let maxA = Number.MIN_VALUE;
    //vec2.scale(prevEdge,prevEdge,-1)

    for(let i = 0; i < candidates.length; i++) {
      let v_cand = Utils.xz(candidates[i].pos)
      let nextEdge = vec2.fromValues(v_cand[0] - v_p[0], v_cand[1] - v_p[1])
      let orient = Math.sign(Utils.crossVec2(prevEdge, nextEdge))
      vec2.normalize(prevEdge,prevEdge)
      vec2.normalize(nextEdge,nextEdge)

      //angle represents angle we have to rotate prevedge to get to nextedge, 
      //represents clockwise or ccw respective to orientation
      //so if orientation is -1, want the most counter clockwise rotated
      let a = Math.acos(vec2.dot(prevEdge, nextEdge) / (vec2.length(prevEdge) * vec2.length(nextEdge)))
      a = Utils.radiansToDegrees(vec2.angle(prevEdge, nextEdge))
      //a = Utils.radiansToDegrees(a)
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

  fillMesh() {
    let i = 0;
    this.pruneAdjList()
    console.log("pruned" + this.adjList.size)
    this.adjList.forEach((v1: GraphVertex) => {
      v1.neighbors.forEach((v2 : GraphVertex) => {
        i++;
        let seg = new Segment(v1, v2);
        let offset = vec3.fromValues(seg.v1.pos[0], 0.2, seg.v1.pos[2])
        let p1mesh = new Mesh('/geo/plane.obj', offset, vec3.fromValues(0.05,0.05,0.05), vec3.fromValues(0,0,0))
        p1mesh.m_color = vec4.fromValues(0.1,0.3 * (v1.id - 20),0.1,1)

        
        if(v1.id  == 6) {
          console.log("neighbors of vertex 6")
          v1.neighbors.forEach((v : GraphVertex) => {
            console.log("id" + v.id)
          })
          this.fullMesh.transformAndAppend(this.m_plane, p1mesh);

        }
        offset = vec3.fromValues(seg.v2.pos[0], 0.1, seg.v2.pos[2])
        let p2mesh = new Mesh('/geo/plane.obj', offset, vec3.fromValues(0.05,0.05,0.05), vec3.fromValues(0,0,0))
        p2mesh.m_color = vec4.fromValues(1.5,0.2 * i,0.5,1)
       // if(v2.id == 3) {

        //this.fullMesh.transformAndAppend(this.m_plane, p2mesh);
        //}
        let segVec = vec3.create()
        vec3.subtract(segVec, seg.v2.pos, seg.v1.pos);
        let length = vec3.length(segVec)
        vec3.normalize(segVec,segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0,1,0), segVec)
        vec3.normalize(crossVec,crossVec);
        vec3.scale(crossVec, crossVec, 0.05)
        //segVec = Utils.abs3(segVec)
        let midpt = vec3.create()
        vec3.lerp(midpt, seg.v1.pos, seg.v2.pos, 0.5)
        let angle = vec3.angle(segVec, vec3.fromValues(0,0,1))
        
        angle = Utils.radiansToDegrees(angle)
  
        let planemesh = new PolyPlane()
        planemesh.points.push(vec4.fromValues(seg.v1.pos[0], 0, seg.v1.pos[2], 1))
        planemesh.points.push(vec4.fromValues(seg.v1.pos[0] + crossVec[0], 0, seg.v1.pos[2] + crossVec[2], 1))
        planemesh.points.push(vec4.fromValues(seg.v2.pos[0] + crossVec[0], 0, seg.v2.pos[2] + crossVec[2], 1))
        planemesh.points.push(vec4.fromValues(seg.v2.pos[0], 0, seg.v2.pos[2], 1))

        //planemesh.m_color = vec4.fromValues(9.5,0.04 * i,0.5,1)
        planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
        this.fullMesh.transformAndAppend(planemesh, planemesh);
  
      });
    });
    console.log("FUllmesh" + this.fullMesh.positions)


    this.findFaces()


    for(let i = 0; i < this.faces.length;i++) {
      let face = this.faces[i]
      let planemesh = new PolyPlane()
      console.log("FACE " + i)
      for(let j = 0; j < face.length; j++) {
        let point = Utils.vec3ToVec4(face[j].pos,1);
        point[1] = 0.1   + 0.03 * i;
        planemesh.points.push(point)
        console.log(face[j].id)

      }
      if(planemesh.points.length > 2) {
        planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
       this.fullMesh.transformAndAppend(planemesh, planemesh);
  
      }
    }
    console.log("faces" + this.faces)

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
      if (v1 != vert) {
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
          
          console.log('v1 s1 ' + s1.v1.id)
          console.log('v2 s1 ' + s1.v2.id)

          console.log('v1 ' + v1.id)
          console.log('v2 ' + v2.id)
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

  advanceTurtle() {
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

    vec3.scaleAndAdd(this.currTurtle.position, this.currTurtle.position, step, 1);
    
    let v2 = vec3.create();
    vec3.copy(v2, this.currTurtle.position);
    let vert2 = new GraphVertex(v2);

    let dir = vec3.create();
    vec3.subtract(dir, vert2.pos, vert1.pos)
    vec3.normalize(dir, dir);
    //vec3.scaleAndAdd(vert1.pos, vert1.pos, dir, 0.2);
    let seg = new Segment(vert1, vert2);
    
    let isect = this.checkEdgeOverlap(seg)
    if(isect !== undefined) {
      console.log("ISECTED" + isect)
      vec3.copy(vert2.pos, isect.point)
      let closest = this.getClosestVertex(vert2)
      if(vec3.dist(closest.pos,vert2.pos) < 0.05) {
        vert2 = closest
      }  else {
        this.splitEdge(isect.edge.v1, isect.edge.v2, vert2)  
      }
    } else {
      let closest = this.getClosestVertex(vert2)
      if(closest !== undefined && vec3.dist(closest.pos, vert2.pos) < 0.05) {
        vert2 = closest
      }
    }

    vec3.copy(this.currTurtle.position, vert2.pos)
    this.addNeighbor(vert1, vert2)
    this.currTurtle.vertex = vert2;
   //this.addNeighbor(vert2, vert1)

  }

  fillCharExpansions() {
  //  this.charExpansions.set('X', 'F!!!!F!F!!F!!!!F');
    this.charExpansions.set('X', 'XF!!!F[FFFX]!!!!F!!X[F!!!F!]!!!!FXX');
  }

  setAxiom() {
    this.axiom = "X";

  }

  fillCharToAction() {
    this.charToAction.set('F', () => {
      this.advanceTurtle();
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

    this.charToAction.set('[', () => {
      this.pushTurtle();
    });

    this.charToAction.set(']', () => {
      this.popTurtle();
    });

  }


}

export default Roads;
