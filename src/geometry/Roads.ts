import {vec3, vec4, mat2, mat4, vec2, mat3} from 'gl-matrix';
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
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
var OBJ = require('webgl-obj-loader') ;
var getPixels = require('get-pixels') ;

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
      //theta = 2 * Math.PI - theta
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

    this.min_l = 0.5;//vec2.length(p)  * 0.1

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


class OrientedBoundingBox2D {
  pos : vec2
  rot_angle : number 
  extents : vec2
  long_axis : vec2
  short_axis : vec2

  corners:Array<vec2>
  constructor() {
    this.pos = vec2.create()
    this.rot_angle = 0
    this.extents = vec2.create()
    this.long_axis = vec2.create()
    this.short_axis = vec2.create()
    this.corners = new Array<vec2>()
  }

  getArea() {
    return this.extents[0] * this.extents[1]
  }

  copy(obb : OrientedBoundingBox2D) {
    vec2.copy(this.pos, obb.pos)
    this.rot_angle = obb.rot_angle
    vec2.copy(this.extents, obb.extents)
    vec2.copy(this.long_axis, obb.long_axis)
    vec2.copy(this.short_axis, obb.short_axis)

    this.corners = new Array<vec2>()
    for(let i = 0; i < obb.corners.length; i++) {
      let v = vec2.create()
      vec2.copy(v, obb.corners[i])
      this.corners.push(v)
    }
  }

  getCorners() {
    this.corners = new Array<vec2>()
    let w_half = this.extents[0] * 0.5
    let h_half = this.extents[1] * 0.5

    let trans = mat3.create()
    mat3.translate(trans,trans,this.pos)
    mat3.rotate(trans,trans,-this.rot_angle)
    mat3.scale(trans,trans,this.extents)

    let p1 = vec2.fromValues(- 0.5, - 0.5)
    let p2 = vec2.fromValues(- 0.5,  0.5)
    let p3 = vec2.fromValues(0.5, 0.5)
    let p4 = vec2.fromValues(0.5, - 0.5)

    vec2.transformMat3(p1,p1,trans)
    vec2.transformMat3(p2,p2,trans)
    vec2.transformMat3(p3,p3,trans)
    vec2.transformMat3(p4,p4,trans)

    // vec2.rotate(p1, p1,vec2.create(),this.rot_angle)
    // vec2.rotate(p2, p2,vec2.create(),this.rot_angle)
    // vec2.rotate(p3, p3,vec2.create(),this.rot_angle)
    // vec2.rotate(p4, p4,vec2.create(),this.rot_angle)

    // vec2.add(p1,p1, this.pos)    
    // vec2.add(p2,p2, this.pos)
    // vec2.add(p3,p3, this.pos)
    // vec2.add(p4,p4, this.pos)

    this.corners.push(p1)
    this.corners.push(p2)
    this.corners.push(p3)
    this.corners.push(p4)

  }

  getAxes() {
    let p1 = this.corners[0]
    let p2 = this.corners[1]
    let p3 = this.corners[2]

    let p1p2 = vec2.distance(p1, p2)
    let p2p3 = vec2.distance(p2, p3)

    let dir = vec2.create()
    let ortho = vec2.create()
    if(p1p2 < p2p3) {
      vec2.subtract(dir, p2, p1);
      vec2.subtract(ortho, p3, p2)

    } else {
      vec2.subtract(dir, p3, p2);
      vec2.subtract(ortho, p2, p1)
    }
    vec2.normalize(dir, dir)
    vec2.normalize(ortho, ortho)

    this.short_axis = dir
    this.long_axis = ortho

  }

  getMinimumFromFace(face : Array<GraphVertex>, axis1 : number = 0, axis2 : number = 2) {

    let minArea = Number.MAX_VALUE
    let bb = new BoundingBox2D(0,0,0,0)
    bb.fromFace(face)
    let center = bb.getCenter() //vec2 center
    this.pos = center
    for(let i = 0 ; i < face.length; i++) {
      //calculate direction and angle of current edge
      let p1 = Utils.xz(face[i].pos)
      let p2 = Utils.xz(face[(i + 1) % face.length].pos)
      let e1 = vec2.create()
      vec2.subtract(e1, p2, p1)

      let dir = vec2.create()
      vec2.normalize(dir, e1)

      let xaxis = vec2.fromValues(1,0)
      let angle = vec2.angle(xaxis, dir)

      let o = Math.sign(Utils.crossVec2(dir, xaxis))
      let d = vec2.dot(dir, xaxis)

      angle = Math.acos(d)
      if (o == -1) {
        angle *= -1
      }

      //rotate the face to be in the space of edge
      let rotated = new Array<vec2>()
      for(let j = 0; j < face.length; j++) {
        let c1 = Utils.xz(face[j].pos)
        vec2.rotate(c1, c1, center, angle)
        rotated.push(c1)
      }

      let currBB = new BoundingBox2D(0,0,0,0) 
      currBB.fromVec2List(rotated)
      let currArea = currBB.getArea()
      if(currArea < minArea) {  
        this.extents = currBB.getSize()
        this.rot_angle = angle
        minArea = currArea
      }
    }

    this.getCorners()
    this.getAxes()
  }
}



 

class BoundingBox2D {
  minCorner : vec2
  maxCorner : vec2

  constructor(minX : number, maxX : number, minY : number, maxY : number) {
    this.maxCorner = vec2.fromValues(maxX, maxY)
    this.minCorner = vec2.fromValues(minX, minY)


  }


  getSize() {
    let x = (Math.abs(this.maxCorner[0] - this.minCorner[0]))
    let y = (Math.abs(this.maxCorner[1] - this.minCorner[1]))
    return vec2.fromValues(x,y)
  }

  getArea() {
    let x = (Math.abs(this.maxCorner[0] - this.minCorner[0]))
    let y = (Math.abs(this.maxCorner[1] - this.minCorner[1]))
    return x * y
  } 

  getCenter() {
    let x = this.minCorner[0] + (Math.abs(this.maxCorner[0] - this.minCorner[0])) * 0.5
    let y = this.minCorner[1] + (Math.abs(this.maxCorner[1] - this.minCorner[1])) * 0.5

    let res = vec2.fromValues(x,y)
    return res
  }

  fromVec2List(face : Array<vec2>) {
    let minX = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE
    let minZ = Number.MAX_VALUE
    let maxZ = -Number.MAX_VALUE

    for(let i = 0 ; i < face.length; i++) {
      minX = Math.min(face[i][0], minX)
      maxX = Math.max(face[i][0], maxX)
      minZ = Math.min(face[i][1], minZ)      
      maxZ = Math.max(face[i][1], maxZ)
    }

    this.maxCorner = vec2.fromValues(maxX, maxZ)
    this.minCorner = vec2.fromValues(minX, minZ)


  }
  

  fromFace(face : Array<GraphVertex>, axis1 : number = 0, axis2 : number = 2) {
    let minX = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE
    let minZ = Number.MAX_VALUE
    let maxZ = -Number.MAX_VALUE

    for(let i = 0 ; i < face.length; i++) {
      minX = Math.min(face[i].pos[axis1], minX)
      maxX = Math.max(face[i].pos[axis1], maxX)
      minZ = Math.min(face[i].pos[axis2], minZ)      
      maxZ = Math.max(face[i].pos[axis2], maxZ)
    }

    this.maxCorner = vec2.fromValues(maxX, maxZ)
    this.minCorner = vec2.fromValues(minX, minZ)


  }

  

  fromPosList(face : Array<any>, axis1 : number = 0, axis2 : number = 2) {
    let minX = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE
    let minZ = Number.MAX_VALUE
    let maxZ = -Number.MAX_VALUE

    for(let i = 0 ; i < face.length; i++) {
      minX = Math.min(face[i][axis1], minX)
      maxX = Math.max(face[i][axis1], maxX)
      minZ = Math.min(face[i][axis2], minZ)      
      maxZ = Math.max(face[i][axis2], maxZ)
    }

    this.maxCorner = vec2.fromValues(maxX, maxZ)
    this.minCorner = vec2.fromValues(minX, minZ)


  }
}



class GraphVertex {
  static currId : number = 0;
  pos:vec3;
  //neighbors : Set<GraphVertex>;
  id:number;
  constructor(pos : vec3) {
    this.pos = pos;
    //this.neighbors = new Set<GraphVertex>()
    this.id = GraphVertex.currId;
    GraphVertex.currId+=1;
  }

  static boundingBoxFromVerts(face : Array<GraphVertex>) {

    let minX = Number.MAX_VALUE
    let maxX = -Number.MAX_VALUE
    let minZ = Number.MAX_VALUE
    let maxZ = -Number.MAX_VALUE

    for(let i = 0 ; i < face.length; i++) {
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

  //s1.v1 = a, s1.v2 = b, s2.v1 = c, s2.v2 = d
  colinearWith(s2 : Segment) {
    let a = vec2.fromValues(this.v1.pos[0], this.v1.pos[2])
    let b = vec2.fromValues(this.v2.pos[0], this.v2.pos[2])
    let c = vec2.fromValues(s2.v1.pos[0], s2.v1.pos[2])
    let d = vec2.fromValues(s2.v2.pos[0], s2.v2.pos[2])

    let ab = vec2.create()
    vec2.subtract(ab, b, a)
    let ac = vec2.create()
    vec2.subtract(ac, c, a)
    let ad = vec2.create()
    vec2.subtract(ad, d, a)

    let err = 0.0001
    return (Math.abs(Utils.crossVec2(ab, ac)) < err && Math.abs(Utils.crossVec2(ab, ad)) < err)

    
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


class Block {
  parcels : Array<Parcel>
  constructor() {
    this.parcels = new Array<Parcel>()
  }

  insetParcels(inset : number) {
    let original_face = this.parcels[0].face

    let next_parcels = new Array<Parcel>()

    for(let i = 0; i < this.parcels.length;i++) {
      let p = this.parcels[i]
      p.splitInset(inset)
      p.graph.findFaces()
      for(let j = 0; j < p.graph.faces.length; j++) {
        let next_parc = new Parcel(p.graph.faces[j])
        next_parc.flag = p.flag
        next_parcels.push(next_parc)
      }
    }

    this.parcels = next_parcels

    for(let i = 0; i < this.parcels.length; i++){
      this.parcels[i].hasStreetAccess(original_face)
    }
  }

  scaleParcel(scale : vec3) {
    let original_face = this.parcels[0].face

    let next_parcels = new Array<Parcel>()

    for(let i = 0; i < this.parcels.length;i++) {
      let p = this.parcels[i]
      p.splitScale(scale)
      p.graph.findFaces()
      for(let j = 0; j < p.graph.faces.length; j++) {
        let next_parc = new Parcel(p.graph.faces[j])
        next_parc.flag = p.flag
        next_parcels.push(next_parc)
      }
    }

    this.parcels = next_parcels

    for(let i = 0; i < this.parcels.length; i++){
      this.parcels[i].hasStreetAccess(original_face)
    }
  }


  subdivideParcels(minArea : number = 0.14, w_min = -0.2, w_max = 0.2, sym = false, iterations = 6) {
    let original_face = this.parcels[0].face
    //console.log(this.parcels.length)

    let n = 0;
    let below_area = false
    while(n < iterations) {
      n++
      let next_parcels = new Array<Parcel>()
      for(let i = 0; i < this.parcels.length;i++) {
        let p = this.parcels[i]
       // p.getOBB()

        //if larger than area limit, split again, otherwise keep
        if(p.obb.getArea() > minArea && !p.flag) {
          let w = Utils.randomFloatRange(w_min,w_max)
          if(sym) {
            p.splitOBBSym(w)

          } else {
            p.splitOBB(w)
          }
          if(p.flag) {
            console.log("flaggeddd")
          }
          p.graph.findFaces()
          for(let j = 0; j < p.graph.faces.length; j++) {
            let next_parc = new Parcel(p.graph.faces[j])
            next_parc.flag = p.flag
            next_parcels.push(next_parc)
            
          }
        } else  {
          below_area = true
          if(!p.flag)
          next_parcels.push(p)
        }

      }
  
      this.parcels = next_parcels
    }

    for(let i = 0; i < this.parcels.length; i++){
      this.parcels[i].hasStreetAccess(original_face)
    }

  }
}


class Parcel {
  graph : Graph
  face:Array<GraphVertex>
  obb:OrientedBoundingBox2D
  street_access = false
  flag = false

  has_street_vert = false

  constructor(face : Array<GraphVertex>) {
    this.graph = new Graph()
    this.graph.fromFace(face)
    this.face = face
    this.getOBB()
  }


  copy(p : Parcel) {
    this.graph.copy(p.graph)
    this.face = new Array<GraphVertex>()
    for(let i = 0; i < p.face.length;i++) {
      this.face.push(p.face[i])
    }
    this.flag = p.flag
    this.obb.copy(p.obb)
  }

  squareAcuteAngles(angle_delta : number, length_delta : number) {
    let squared_arr = new Array<GraphVertex>()

    for(let i = 0; i < this.face.length; i++) {
      let prev = i == 0 ? this.face.length - 1 : (i - 1) 
      let next = (i+1) % this.face.length

      let prevEdge = vec3.create()
      vec3.subtract(prevEdge, this.face[prev].pos, this.face[i].pos)
      let l1 = vec3.length(prevEdge)
      vec3.normalize(prevEdge, prevEdge)

      let nextEdge = vec3.create()
      vec3.subtract(nextEdge, this.face[next].pos, this.face[i].pos)
      let l2 = vec3.length(prevEdge)
      vec3.normalize(nextEdge, nextEdge)

      let d = Math.min(l1 * 0.5, l2 * 0.5)

      //let angle = vec3.angle(prevEdge, nextEdge)
      let dot = vec3.dot(prevEdge, nextEdge)
      let angle = Math.acos(dot)
      //Utils.radiansToDegrees(angle) < delta
      if (Utils.radiansToDegrees(angle) < angle_delta) {
        if(d < length_delta) {

        } else {
          let s1 = vec3.create()
          vec3.scaleAndAdd(s1, this.face[i].pos,prevEdge, d)
    
          let s2 = vec3.create()
          vec3.scaleAndAdd(s2, this.face[i].pos,nextEdge, d)
  
          squared_arr.push(new GraphVertex(s1))
          squared_arr.push(new GraphVertex(s2))  
        }

      } else {
        squared_arr.push(this.face[i])

      }


    }
    this.face = squared_arr
    this.graph.fromFace(this.face)
  }

  splitScale(scale : vec3) {
    let original_face = this.face
    this.scaleParcelUniformXZ(scale)
    this.addOriginalFace(original_face)
    
  }

  splitInset(inset : number) {
    let original_face = this.face
    this.insetParcelUniformXZ(inset)
    this.addOriginalFace(original_face)
    
  }

  //creates the face and assigns neighbors to corresponding verts in this face
  addOriginalFace(original_face : Array<GraphVertex>) {
    for(let i = 0; i < this.face.length; i++) {
      let v1 = original_face[i]
      let v2 = this.face[i]
      let v3 = original_face[(i + 1) % this.face.length]
      this.graph.addNeighbor(v1, v2)
      this.graph.addNeighbor(v1, v3)
    }
  }

  insetParcelUniformXZ(inset : number, limit = 0.06) {
    let center2d = this.obb.pos
    let inset_arr = new Array<GraphVertex>()
    for(let i = 0; i < this.face.length; i++) {
      let clamp_inset = inset

      let center3d = vec3.fromValues(center2d[0],this.face[i].pos[1],center2d[1])
      //if too close to center, stop insetting 
      let dist = vec3.distance(this.face[i].pos, center3d)
     // if(dist - inset < limit) {
        clamp_inset = Math.min(inset, dist - limit)
     // }


      let prev = i == 0 ? this.face.length - 1 : (i - 1) 
      let next = (i+1) % this.face.length

      let yaxis = vec3.fromValues(0,1,0)

      //get the perpendicular directions for inset
      let prevEdge = Utils.directionBetween(this.face[i].pos, this.face[prev].pos)
      let prevPerp = vec3.create()
      vec3.cross(prevPerp, prevEdge,yaxis)
      vec3.normalize(prevPerp, prevPerp)

      let nextEdge = Utils.directionBetween(this.face[next].pos, this.face[i].pos)
      let nextPerp = vec3.create()
      vec3.cross(nextPerp, nextEdge,yaxis)
      vec3.normalize(nextPerp, nextPerp)


      //let o = Math.sign(Utils.crossVec2(xz1, xz2))
      //clamp_inset *= o
      let tol = 0//clamp_inset
      //points of previous segment to inset
      
      let p1 = vec3.create()
      vec3.copy(p1,this.face[prev].pos)
      vec3.scaleAndAdd(p1, p1, prevPerp, -clamp_inset)
      vec3.scaleAndAdd(p1, p1, prevEdge, -tol)

      let p2 = vec3.create()
      vec3.copy(p2,this.face[i].pos)
      vec3.scaleAndAdd(p2, p2, prevPerp, -clamp_inset)
      vec3.scaleAndAdd(p2, p2, prevEdge, tol)


      //points of next segment to inset
      let p3 = vec3.create()
      vec3.copy(p3,this.face[i].pos)
      vec3.scaleAndAdd(p3, p3, nextPerp, -clamp_inset)
      vec3.scaleAndAdd(p3, p3, nextEdge, -tol)

      let p4 = vec3.create()
      vec3.copy(p4,this.face[next].pos)
      vec3.scaleAndAdd(p4, p4, nextPerp, -clamp_inset)
      vec3.scaleAndAdd(p4, p4, nextEdge, tol)


      let seg1 = new Segment(new GraphVertex(p1), new GraphVertex(p2))
      let seg2 = new Segment(new GraphVertex(p3), new GraphVertex(p4))

      let colinear = seg1.colinearWith(seg2)
      let isect = seg1.getIntersection(seg2)

      if(colinear) {
        //console.log("colinear")
        isect = vec3.create()
        vec3.scaleAndAdd(isect, this.face[i].pos, prevPerp,-clamp_inset)

      } else {

        if(isect == undefined) {
          isect = vec3.create()
          // vec3.copy(isect, this.face[i].pos)
           vec3.scaleAndAdd(isect, this.face[i].pos, prevPerp,-clamp_inset)

            //console.log("no isect")
        } else {
          //console.log("isect " + isect)
  
        }
      }

      let dir = vec3.create()
      vec3.lerp(dir, prevEdge,nextEdge,0.5)
     // vec3.subtract(dir, center3d, this.face[i].pos)
      vec3.normalize(dir, dir)

      let sc = vec3.create()
      vec3.scaleAndAdd(sc, this.face[i].pos, dir, inset)
      if(isect !== undefined) {
        inset_arr.push(new GraphVertex(isect))

      }

    }

    this.face = inset_arr
    this.graph.fromFace(this.face)

  }

  rotateParcelY(angle : number) {
    let center2d = this.obb.pos
    let rotated = new Array<GraphVertex>()
    for(let i = 0; i < this.face.length; i++) {
      let sc = vec3.create()
      vec3.copy(sc, this.face[i].pos)
      let center3d = vec3.fromValues(center2d[0],this.face[i].pos[1],center2d[1])
      vec3.rotateY(sc,sc,center3d,angle)
      rotated.push(new GraphVertex(sc))
    }

    this.face = rotated
    this.graph.fromFace(this.face)
    this.obb.rot_angle += angle

  }

  scaleParcelUniformXZ(scale : vec3)
  {
    let center2d = this.obb.pos
    let scaled = new Array<GraphVertex>()
    for(let i = 0; i < this.face.length; i++) {
      let sc = vec3.create()
      vec3.copy(sc, this.face[i].pos)
      let center3d = vec3.fromValues(center2d[0],this.face[i].pos[1],center2d[1])
      Utils.scaleAboutAnchor(sc,center3d,scale)
      scaled.push(new GraphVertex(sc))
    }

    this.face = scaled
    this.graph.fromFace(this.face)

  }

  getOBB() {
      this.obb = new OrientedBoundingBox2D()
    if(this.face.length > 0) {
      this.obb.getMinimumFromFace(this.face)  
    }

  }

 
  //w: pivot offset from midpoint at which to split; fraction of long axis length
  splitOBB(w = 0.0) {
    w *= Math.max(this.obb.extents[0], this.obb.extents[1])
    let midpt = vec3.fromValues(this.obb.pos[0], 0, this.obb.pos[1])
    let dir3 = vec3.fromValues(this.obb.short_axis[0], 0, this.obb.short_axis[1])
    let ortho3 = vec3.fromValues(this.obb.long_axis[0], 0, this.obb.long_axis[1])

    vec3.scaleAndAdd(midpt, midpt, ortho3, w)
    this.splitAtPointAlong(midpt, dir3)

  }

  splitOBBSym(w = 0.0) {
    w *= Math.max(this.obb.extents[0], this.obb.extents[1])
    let midpt = vec3.fromValues(this.obb.pos[0], 0, this.obb.pos[1])
    let dir3 = vec3.fromValues(this.obb.short_axis[0], 0, this.obb.short_axis[1])
    let ortho3 = vec3.fromValues(this.obb.long_axis[0], 0, this.obb.long_axis[1])

    let m1 = vec3.create()
    vec3.scaleAndAdd(m1, midpt, ortho3, w)
    this.splitAtPointAlong(m1, dir3)

    let m2 = vec3.create()
    vec3.scaleAndAdd(m2, midpt, ortho3, -w)
    this.splitAtPointAlong(m2, dir3)


  }

  splitAtPointAlong(midpt : vec3, dir : vec3) {
    //create long line segment in both directions from midpt to cut across
    let m1 = vec3.create()
    vec3.scaleAndAdd(m1,midpt,dir,100.0)

    let m2 = vec3.create()
    vec3.scaleAndAdd(m2,midpt,dir,-100)

    let s1 = new GraphVertex(m1)
    let s2 = new GraphVertex(m2)
    let seg = new Segment(s1, s2)
    this.splitAlong(seg)

  }

  //p1 and p2 are endpoints of segment, w is offset from midpoint on which to split
  splitPerpendicularTo(p1:vec3, p2: vec3, w:number = 0) {
    let e1 = vec3.create()
    vec3.subtract(e1, p1, p2)

    let dir = vec3.create()
    vec3.cross(dir, e1, vec3.fromValues(0,1,0))
    let midpt = vec3.create()
    vec3.lerp(midpt, p1, p2, 0.5)

    this.splitAtPointAlong(midpt, dir)

  }

  splitInHalf() {
    let e1 = vec3.create()
    vec3.subtract(e1, this.face[1].pos, this.face[0].pos)

    let dir = vec3.create()
    vec3.cross(dir, e1, vec3.fromValues(0,1,0))
    let midpt = vec3.create()
    vec3.lerp(midpt, this.face[1].pos, this.face[0].pos, 0.5)
    vec3.scaleAndAdd(midpt,midpt,dir,0.1)

    let m2 = vec3.create()
    vec3.scaleAndAdd(m2,m2,dir,-100)

    let s1 = new GraphVertex(midpt)
    let s2 = new GraphVertex(m2)
    let seg = new Segment(s1, s2)
    this.splitAlong(seg)

  }

  splitAlong(s: Segment) {
    let isects = this.graph.getAllEdgeOverlaps(s)
    isects.sort((a, b) => a.dist - b.dist)
    
    if(isects.length%2!==0){
      console.log("baddddd " + isects.length)
      console.log("baddddd pos " + this.obb.pos)
      this.flag = true
      return
    }
    for(let i = 0; i < isects.length - 1; i += 2) {
      let i1 = isects[i]
      let i2 = isects[i + 1]
      let v1 = new GraphVertex(i1.point)
      this.graph.splitEdge(i1.edge.v1, i1.edge.v2, v1)  

      let v2 = new GraphVertex(i2.point)
      this.graph.splitEdge(i2.edge.v1, i2.edge.v2, v2)  

      this.graph.addNeighbor(v1, v2)
    }
    //console.log(isects)

  }


  getAllEdgeOverlaps(s1:Segment) : Array<Intersection> {
    let res = new Array<Intersection>()

    for(let i = 0; i < this.face.length; i++) {
      let v1 = this.face[i]
      let v2 = this.face[(i + 1) % this.face.length]
      let s2 = new Segment(v1, v2);
      let isect = s1.getIntersection(s2) 
      if(isect!==undefined) {
        let dist = vec3.distance(s1.v1.pos, isect)
        res.push(new Intersection(isect, s2, dist))
  
      }


    }
    return res

  }

  hasStreetAccess(streets:Array<GraphVertex>) {
    for(let j = 0; j < this.face.length; j++) {
      let face = this.face
      let s1 = new Segment(face[j], face[(j + 1) % face.length])
      for(let f = 0; f < streets.length; f++) {
        let s2 = new Segment(streets[f], streets[(f + 1) % streets.length])
        if(s1.colinearWith(s2)) {
          this.street_access = true
        }
        if(vec3.distance(streets[f].pos, face[j].pos) < 0.00001) {
          this.has_street_vert = true
        }
      }
    }
  }

}

class Graph {

  adjList : Map<GraphVertex,Set<GraphVertex>>
  faces : Array<Array<GraphVertex>>

  constructor() {
    this.adjList = new Map<GraphVertex,Set<GraphVertex>>()
    this.faces = new Array<Array<GraphVertex>>()

  }

  copy(g : Graph) {
    this.adjList.clear()
    g.adjList.forEach((neighbors: Set<GraphVertex>, v:GraphVertex) => {
      neighbors.forEach((vadj : GraphVertex) => {
        this.addNeighbor(v, vadj)
      })
    })
  }

  fromFace(face : Array<GraphVertex>) {
    this.faces = new Array<Array<GraphVertex>>()
    this.adjList = new Map<GraphVertex,Set<GraphVertex>>()
    for(let i = 0; i < face.length; i++) {
      this.addNeighbor(face[i], face[(i+1) % face.length])
    }
  }

    //https://mosaic.mpi-cbg.de/docs/Schneider2015.pdf

  findFaces() {
    this.faces = new Array<Array<GraphVertex>>()
    let finishedVerts = new Set<GraphVertex>()
    let foundFaces = new Set<String>()
    this.adjList.forEach((neighbors: Set<GraphVertex>, v:GraphVertex) => {
      if(true) {
      neighbors.forEach((vadj : GraphVertex) => {
        let visit = new Array<GraphVertex>();
        let prevVert = v;
        let nextVert = vadj;
        visit.push(nextVert)

        let foundV = false;
        let forceStop = false;
        while(!foundV && visit.length < 40 && !forceStop) {

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

          this.adjList.get(nextVert).forEach((cand : GraphVertex) => {
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
      this.adjList.get(v1).forEach((n : GraphVertex) => {
        if(vertSet.has(n)) {
          e += 1
        }
      })
    })

    e /= 2
    return v - e == 0
  }

  addNeighbor(v1 : GraphVertex, v2 : GraphVertex) {

    if(!this.adjList.has(v1)) {
      this.adjList.set(v1, new Set<GraphVertex>())
    }

    if(!this.adjList.has(v2)) {
      this.adjList.set(v2, new Set<GraphVertex>())
    }
    this.adjList.get(v1).add(v2)
    this.adjList.get(v2).add(v1)

   // v1.neighbors.add(v2)
   // v2.neighbors.add(v1)

  }


  removeNeighbor(v1 : GraphVertex, v2 : GraphVertex) {
    if(!this.adjList.has(v1)) {
      this.adjList.set(v1, new Set<GraphVertex>())
    }

    if(!this.adjList.has(v2)) {
      this.adjList.set(v2, new Set<GraphVertex>())
    }

    this.adjList.get(v1).delete(v2)
    this.adjList.get(v2).delete(v1)

  }

  splitEdge(v1 : GraphVertex, v2 : GraphVertex, midpt : GraphVertex) {
    this.addNeighbor(v1, midpt)
    this.addNeighbor(midpt, v2)

    this.removeNeighbor(v1, v2)

  }

  getClosestVertex(vert : GraphVertex) {
    let minDist = Number.MAX_VALUE
    let closestVert : GraphVertex = undefined

    this.adjList.forEach((neighbors : Set<GraphVertex>, v1: GraphVertex) => {
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


  getAllEdgeOverlaps(s1: Segment) : Array<Intersection> {
    let res = new Array<Intersection>()
    let visited = new Set<GraphVertex>()
    this.adjList.forEach((neighbors : Set<GraphVertex>, v1: GraphVertex) => {
      if(v1 !== s1.v1) { // prevent self intersection if edges share vertex
      neighbors.forEach((v2 : GraphVertex) => {
        if(v2 !== s1.v1 && !visited.has(v2)){
        let s2 = new Segment(v1, v2);
        let isect = s1.getIntersection(s2)
        if(isect !== undefined) {
          let dist = vec3.distance(s1.v1.pos, isect)
          res.push(new Intersection(isect, s2, dist))

        }
      }
      });
    }
    visited.add(v1)
    });

    return res
  }

  checkEdgeOverlap(s1: Segment) : Intersection {
    let foundIsect : Intersection = undefined
    let minDist = Number.MAX_VALUE
    this.adjList.forEach((neighbors : Set<GraphVertex>, v1: GraphVertex) => {
      if(v1 !== s1.v1) { // prevent self intersection if edges share vertex
      neighbors.forEach((v2 : GraphVertex) => {
        if(v2 !== s1.v1){
        let s2 = new Segment(v1, v2);
        let isect = s1.getIntersection(s2)
        if(isect !== undefined) {
          let dist = vec3.distance(s1.v1.pos, isect)

          if(minDist > dist) {
            foundIsect = new Intersection(isect, s2, dist)
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
    this.adjList.get(v).forEach((n: GraphVertex) => {
      this.adjList.get(n).delete(v)
    })
    this.adjList.delete(v);
  }

  //iteratively removes vertices of degree 1 or less
  pruneAdjList() {
    let needs_pruning = true;

    while(needs_pruning) {
      needs_pruning = false
      let toRemove = new Array<GraphVertex>()
      this.adjList.forEach((neighbors : Set<GraphVertex>,v1: GraphVertex) => {
        if(neighbors.size <= 1) {
          needs_pruning = true
          toRemove.push(v1)
        }
      })

      for(let i = 0; i < toRemove.length; i++) {
        this.removeFromAdjList(toRemove[i])
      }
    }
  }



  
}

class Intersection {
  point : vec3;
  edge : Segment;
  dist : number // distance from origin
  constructor(point : vec3, edge : Segment, dist : number) {
    this.point = point;
    this.edge = edge;
    this.dist = dist;
  }
}

class Roads extends LSystem {
  seed : number
  prevPosition: vec3;
  prevOrientation : vec3;
  prevDepth : number;
  m_plane : Plane;
  position: vec3;
  orientation: vec3;
  depth : number;
  currTurtle : GraphTurtle
  turtleStack : Array<GraphTurtle>
  basisImage : Array<number>
  perlin_scale : number;
  center_size : number;

  segmentCandidates : Array<Segment>
  //adjList : Set<GraphVertex>
  road_graph : Graph
  //faces : Array<Array<GraphVertex>>
  bounds : BoundingBox2D
  minor_freq : number;
  major_freq : number;

  constructor() {
    super()
    this.perlin_scale = 0.01
    this.minor_freq=0.5;
    this.major_freq=1.0;
    this.center_size = 0.3;
    this.prevPosition = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0,0);
    this.prevDepth = -1;
    this.prevOrientation = vec3.fromValues(0,0,0);
    this.currTurtle = new GraphTurtle()
    this.currTurtle.position = vec3.fromValues(1,0,0);
    this.currTurtle.orientation = vec3.fromValues(0,0,1);
    this.seed = Utils.random() * 1000
    this.orientation = vec3.fromValues(0,0,0);
    this.depth = 0;
    this.m_plane = new Plane();
    this.m_plane.loadMesh();
    this.fullMesh = new Mesh('')
    this.iterations = 7;
    this.road_graph = new Graph()
    this.fillCharToAction()
    //this.faces = new Array<Array<GraphVertex>>()
    this.bounds = new BoundingBox2D(-20,20,-20,20)
    this.bounds = new BoundingBox2D(-6,6,-6,6)

    this.setAxiom()

    // getPixels("././textures/perlin.png", (err : any, pixels : any) => {
    //   if(err) {
    //     console.log("Bad image path")
    //     return
    //   }
    //   console.log("got pixels", pixels.shape.slice())
    // })

  }



  drawVertex(v1:GraphVertex) {
    let offset = vec3.fromValues(v1.pos[0], 0.01, v1.pos[2])
    let p1mesh = new Mesh('/geo/plane.obj', offset, vec3.fromValues(0.05,0.05,0.05), vec3.fromValues(0,0,0))
    p1mesh.m_color = vec4.fromValues(0.1,0.3 * (v1.id - 20),0.1,1)
    this.fullMesh.transformAndAppend(this.m_plane, p1mesh);

  }

  drawEdges() {
    let i = 0;

    this.road_graph.adjList.forEach((neighbors, v1) => {
      neighbors.forEach((v2 : GraphVertex) => {
        //this.drawVertex(v1)
        //this.drawVertex(v2)

        i++;
        let segVec = vec3.create()
        vec3.subtract(segVec, v2.pos, v1.pos);
        vec3.normalize(segVec,segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0,1,0), segVec)
        vec3.normalize(crossVec,crossVec);
        vec3.scale(crossVec, crossVec, 0.15)
  
        let planemesh = new Plane()
        planemesh.p1 = vec4.fromValues(v1.pos[0], 0, v1.pos[2], 1)
        planemesh.p2 = vec4.fromValues(v1.pos[0] + crossVec[0], 0, v1.pos[2] + crossVec[2], 1)
        planemesh.p3 = vec4.fromValues(v2.pos[0] + crossVec[0], 0, v2.pos[2] + crossVec[2], 1)
        planemesh.p4 = vec4.fromValues(v2.pos[0], 0, v2.pos[2], 1)

        planemesh.m_color = vec4.fromValues(0.1,0.1,0.1,1)
        planemesh.uv_cell = 15
        //planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
        this.fullMesh.transformAndAppend(planemesh, planemesh);
  
      });
    });

  }


  drawFaces() {
    for(let i = 0; i < this.road_graph.faces.length;i++) {
      let face = this.road_graph.faces[i]
      let planemesh = new PolyPlane()
      //console.log("FACE " + i)
      for(let j = 0; j < face.length; j++) {
        let point = Utils.vec3ToVec4(face[j].pos,1);
        let point2 = Utils.vec3ToVec4(face[(j + 1) % face.length].pos,1);

        point[1] = 0.1   + 0.03;
        planemesh.points.push(point)
       // console.log(face[j].id)

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
    this.road_graph.pruneAdjList()
    //console.log
    this.drawEdges()
   // console.log("FUllmesh" + this.fullMesh.positions)
    this.road_graph.findFaces()
   // this.drawFaces()
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

      //tensor.getGrid(dir)
      tensor.getGrid(p)
      //tensor.getRadialGrid(p,dir)

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
    vec2.scale(inp, p2, this.perlin_scale)
   //inp[0] += this.seed
    let h1 = Utils.perlin(inp)
    let h2 = Utils.perlin(vec2.fromValues(inp[0] + 0.01,inp[1]))
    let h3 = Utils.perlin(vec2.fromValues(inp[0],inp[1] + 0.01))

    let dh = h2 - h1
    let dhz = h3 - h1

    let grad = vec2.fromValues(dh / 0.01, dhz / 0.01)
    dir = grad
    //console.log("grad " + grad)
    let tensor = new TensorField()
    let radCenter = vec2.fromValues(-0.0,0.0)

    let poff = vec2.create()
    vec2.subtract(poff, p2, radCenter)

    let maj = this.solveRK4(poff, dir , true)
    let min = this.solveRK4(poff, dir, false)

    let maj2 = this.solveRK4(dir, dir , true)
    let min2 = this.solveRK4(dir, dir, false)


   let centerdist = vec2.length(poff)
   let decay = Math.exp(0.4 * - centerdist)
   // decay = Utils.clamp(centerdist * 0.4,0,1)
   decay = Utils.clamp(3 - centerdist * 0.5, 0, 3)
   
   let cl =  Utils.clamp(centerdist * 0.07, 0,1)
    if(centerdist * 0.05 < this.center_size) {
      cl = 0;
    } else {
      cl = 1;
    }

    
   vec2.lerp(maj, maj, maj2, cl)
   vec2.lerp(min, min, min2, cl)
    //maj = maj2
    //min = min2

  // vec2.scaleAndAdd(maj, tensor.major, maj, decay)
  // vec2.scaleAndAdd(min, tensor.minor, min, decay)

    let maj_step = vec3.fromValues(maj[0], 0, maj[1])
    let min_step = vec3.fromValues(min[0], 0, min[1])

    let v_maj = vec3.create();
    vec3.scaleAndAdd(v_maj,segment.v2.pos,maj_step, 0.7)
    let vert_maj = new GraphVertex(v_maj)

    let v_min = vec3.create();
    vec3.scaleAndAdd(v_min,segment.v2.pos,min_step, 0.7)
    let vert_min = new GraphVertex(v_min)


    let s1 = new Segment(segment.v2, vert_maj)
    let s2 = new Segment(segment.v2, vert_min)

    if(Utils.random() < this.major_freq) {
      res.push(s1)
    }
    if(Utils.random() < this.minor_freq) {
      res.push(s2)

    }

    return res
  }


  expandSegments() {
    let i = 0
    while(this.segmentCandidates.length > 0 && i < 3800) {
      i++
      let segment = this.segmentCandidates.shift()

      if(!this.checkLocalConstraints(segment)) {
        continue
      }

      let fixed_segment = this.checkSegmentConstraints(segment)
      this.road_graph.addNeighbor(fixed_segment.v1, fixed_segment.v2)

      if(fixed_segment.v2 == segment.v2) {
        let candidates = this.getNextSegments(fixed_segment)

        for(let i = 0; i < candidates.length; i++) {
            this.segmentCandidates.push(candidates[i])
          
        }
      }
    }
  }


  advanceTurtleTensor(major : boolean) {
    //let mesh = new Mesh('/geo/plane.obj', vec3.clone(this.currTurtle.position), vec3.fromValues(1,1,1), vec3.clone(this.currTurtle.orientation))
    //this.meshes.push(mesh);
    //console.log("curr vert id " + GraphVertex.currId)
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
    this.road_graph.addNeighbor(seg.v1, seg.v2)
    this.currTurtle.vertex = seg.v2;

  }


  resetBoundsSquare(size :number) {
    this.bounds = new BoundingBox2D(-size, size, -size, size)
    this.setAxiom()
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
    let edge_isect = this.road_graph.checkEdgeOverlap(seg)
    let vert2 = seg.v2
    let vert1 = seg.v1
    let tol = 0.5
    let vertTol = 0.4
    //if intersects with an edge,    
    if(edge_isect !== undefined) {
      vec3.copy(vert2.pos, edge_isect.point)
      //determine if the edge intersection is within range of a vertex
      let closest = this.road_graph.getClosestVertex(vert2)
      if(vec3.dist(closest.pos,vert2.pos) < tol) {
        vert2 = closest
      }  else {
        this.road_graph.splitEdge(edge_isect.edge.v1, edge_isect.edge.v2, vert2)  
      }
    } else {
      //determine if it should intersect with a vertex
      let closest = this.road_graph.getClosestVertex(vert2)
      
      if(closest !== undefined) {
        if(vec3.dist(closest.pos, vert2.pos) < vertTol) {
          vert2 = closest
        } else if(vec3.dist(closest.pos, vert2.pos) < tol) {
          this.road_graph.addNeighbor(seg.v1, seg.v2)
          vert1 = seg.v2
          vert2 = closest
        }
      }
    }

    return new Segment(vert1, vert2)
  }


  fillCharExpansions() {
  //  this.charExpansions.set('X', 'F!!!!F!F!!F!!!!F');
    //this.charExpansions.set('X', '[DDX]F[FFX][DXF]');

    //this.charExpansions.set('X', '[DX]FF[FX]');
  }


  

  setAxiom() {
    this.axiom = "X";
    this.segmentCandidates = new Array<Segment>()
    //let v1 = vec3.fromValues(this.bounds.minCorner[0] + 1,0,this.bounds.minCorner[1] + 1)
    let xlen = Math.max((this.bounds.maxCorner[0] - this.bounds.minCorner[0]) / 5.0,3)
    let zlen = Math.max((this.bounds.maxCorner[1] - this.bounds.minCorner[1]) / 5.0,3)

    for(let i = this.bounds.minCorner[0]; i < this.bounds.maxCorner[0]; i+=xlen) {
      for(let j = this.bounds.minCorner[1]; j < this.bounds.maxCorner[1]; j+=zlen) {
        //for(let i = 0; i < 1; i+=xlen) {
          //for(let j = 0; j < 1; j+=zlen) {
    
      
      let v1 = vec3.fromValues(i,0,j);
      let vert1 = new GraphVertex(v1)
  
      let v2 = vec3.fromValues(v1[0],0,v1[2] + 1)
      let vert2 = new GraphVertex(v2)
      let seg = new Segment(vert1,vert2)
  
      let segs = this.getNextSegments(seg)
      for(let s = 0; s < segs.length; s++) {
        this.segmentCandidates.push(segs[s])
  
      }
      }
    }
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

export {Roads, BoundingBox2D, GraphVertex, Parcel, Block, OrientedBoundingBox2D};
