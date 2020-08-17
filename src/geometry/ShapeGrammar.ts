import { vec2, vec3, vec4, mat4, mat3, quat } from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import { gl } from '../globals';
import Mesh from './Mesh';
import PolyPlane from './PolyPlane';

import Utils from './Utils';
import Plane from './Plane';
import { Roads, GraphVertex, BoundingBox2D, Parcel, Block, OrientedBoundingBox2D } from './Roads'
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
var OBJ = require('webgl-obj-loader');

enum TexCell {
  FACADE1,
  FACADE2,
  FACADE3,
  FACADE4,
  FACADE5,
  FACADE6,  
  FACADE7,
  FACADE8,
  FACADE9,
  FACADE10,

  WINDOW1,
  WINDOW2,
  WINDOW3,
  WINDOW4,
  WINDOW5,
  WINDOW6,
  WINDOW7,
  WINDOW8,
  WINDOW9,
  WINDOW10,

  ROOF1,
  ROOF2,
  ROOF3,
  ROOF4,
  ROOF5,
  ROOF6,
  ROOF7,
  ROOF8,
  ROOF9,
  ROOF10,

  DOOR1,
  DOOR2,
  DOOR3,
  DOOR4,
  DOOR5,
  DOOR6,
  DOOR7,
  DOOR8,
  DOOR9,
  DOOR10,

  ROAD1,
  ROAD2,
  ROAD3,
  ROAD4,
  ROADWHITE,
  ROADYELLOW,

  GRAVEL1,

  TREETRUNK1,
  TREETRUNK2,
  LEAVES1,

  GREEN,
  FILLER1,
  FILLER2,
  FILLER3,
  FILLER4,
  FILLER5,
  FILLER6,
  FILLER7,
  FILLER8,
  FILLER9,

  LOWLOD1,
  LOWLOD2,
  LOWLOD3,
  LOWLOD4,
  LOWLOD5,
  LOWLOD6,
  LOWLOD7,
  LOWLOD8,
  LOWLOD9,
  LOWLOD10,

}

class ShapeNode {
  symbol: string;
  rotation: vec3;
  position: vec3;
  scale: vec3;
  meshname: string;
  terminal: boolean;
  depth: number;
  children: Array<ShapeNode>;
  maxDepth: number;
  tex_cell: number;
  global_tex : boolean;
  parent: ShapeNode;
  parcel : Parcel
  polyplane: PolyPlane;
  flip_uvy : boolean

  master: any
  constructor() {
    this.maxDepth = -1;
    this.symbol = "start";
    this.rotation = vec3.fromValues(0, 0, 0);
    this.position = vec3.fromValues(0, 0.0, 0);
    this.scale = vec3.fromValues(1, 1, 1);
    this.meshname = 'cube';
    this.terminal = false;
    this.depth = 0;
    this.tex_cell = 0;
    this.parent = undefined
    this.polyplane = undefined
    this.master = undefined
    this.children = new Array<ShapeNode>();
    this.global_tex = false;
    this.flip_uvy = false;
  }


  getMaster() {
    if (this.master !== undefined) {
      return this.master
    }
    let currNode = this.parent
    while (currNode !== undefined) {
      if (currNode.master !== undefined) {
        return currNode.master
      }
      currNode = currNode.parent
    }

    return undefined

  }


  removeChildrenWithSymbol(symbol : string) {
      //remove top plane from entrance and levels since it won't be visible
      let ind = 0
      let toRemove = new Array<ShapeNode>()
      for(let i = 0; i < this.children.length; i++) {
        if(this.children[i].symbol == symbol) {
          toRemove.push(this.children[i])
        }
      }
      for(let i =0 ; i <toRemove.length; i++) [
        this.removeChild(toRemove[i])

      ]
  }

  getGlobalPosition() {
    let currNode = this.parent
    let res = vec3.create()
    vec3.copy(res, this.position)
    while (currNode !== undefined) {
      vec3.add(res, res, currNode.position)
      currNode = currNode.parent
    }
    return res

  }
  approxGlobalScale() {
    let currNode = this.parent
    let res = vec3.create()
    vec3.copy(res, this.scale)
    while (currNode !== undefined) {
      vec3.multiply(res, res, currNode.scale)
      currNode = currNode.parent
    }
    return res
  }

  setTextureForAllChildren(t : TexCell) {
    this.tex_cell = t
    for(let i = 0; i < this.children.length; i++) {
      this.children[i].tex_cell = t
      this.children[i].setTextureForAllChildren(t)
    }
  }

  //copies t and duplicates all its children into this shapenode
  copyrecursive(t:ShapeNode) {
    this.copyshallow(t)
    if(t.polyplane !== undefined) {
      this.polyplane = new PolyPlane()
      this.polyplane.copyPointsFrom(t.polyplane)
    }

    if(t.parcel !== undefined) {
      this.parcel = new Parcel(new Array<GraphVertex>())
      this.parcel.copy(t.parcel)
    }

    for(let i = 0; i < t.children.length; i++) {
      let s = new ShapeNode()
      s.copyshallow(t.children[i])
      
      if(t.children[i].parcel !== undefined) {
        s.parcel = new Parcel(new Array<GraphVertex>())
        s.parcel.copy(t.children[i].parcel)
      }

      if(t.children[i].polyplane !== undefined) {
        s.polyplane = new PolyPlane()
        s.polyplane.copyPointsFrom(t.children[i].polyplane)
      }
      s.copyrecursive(t.children[i])
      this.addChild(s)

    }
  }


  copyshallow(t: ShapeNode) {
    vec3.copy(this.position, t.position);
    vec3.copy(this.rotation, t.rotation);
    vec3.copy(this.scale, t.scale);
    this.meshname = t.meshname;
    this.symbol = t.symbol;
    this.terminal = t.terminal;
    this.depth = t.depth;
    this.tex_cell = t.tex_cell
  }

  addChild(s: ShapeNode) {
    this.children.push(s)
    s.parent = this
  }

  removeChild(s : ShapeNode) {
    let idx = this.children.indexOf(s)
    this.children.splice(idx, 1)
    s.parent = undefined
  }
}

class FreqPair {
  freq: number;
  rule: (arg0: ShapeNode) => Array<ShapeNode>;
  constructor(f: number, r: (arg0: ShapeNode) => Array<ShapeNode>) {
    this.freq = f;
    this.rule = r;
  }
}


class ShapeNodeFunctions {
  static windowFactor = 5

  static randomDoor() {
    let r = Utils.random()

    if (r < 0.1) {
      return 'door1'
    } else if (r < 0.4) {
      return 'door2'
    } else if (r < 0.6) {
      return 'door3'
    } else if (r < 0.8) {
      return 'door4'
    } else {
      return 'door5'
    }

  }

  static randomRoof() {
    let r = Utils.random()

    if (r < 0.1) {
      return 'roof1'
    } else if (r < 0.4) {
      return 'roof2'
    } else {
      return 'roof1'
    }

  }

  static randomRoofDecor(s: ShapeNode) {
    let r = Utils.random()

    s.symbol = ''
    if (r < 0.08) {
      let randx = Utils.random() * 0.8 + 0.2;
      let randz = Utils.random() * 0.8 + 0.2;

      s.meshname = 'roof1'
      let ys = 1.2 * Utils.random()
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz

      return

    } else if (r < 0.12) {
      let randx = Utils.random() * 0.8 + 0.2;
      let randz = Utils.random() * 0.8 + 0.2;

      s.meshname = 'cube'
      let ys = 1.2 * Utils.random() + 1.0
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz
     // s.symbol = 'start'

      return

    } else if (r < 0.15) {
      let randx = Utils.random() * 0.8 + 0.2;
      let randz = Utils.random() * 0.8 + 0.2;

      s.meshname = 'roof2'
      let ys = 1.2 * Utils.random()
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz
      //s.symbol = 'start'

      return

    } else if (r < 0.17) {
      ShapeNodeFunctions.spike(s)
      return

    } else if (r < 0.19) {
      ShapeNodeFunctions.spire(s)
      return

    } else if (r < 0.4) {
      ShapeNodeFunctions.watertower(s)
      s.position[1] = 0
      s.scale[0] *= 1.2
      s.scale[1] *= 1.2
      s.scale[2] *= 1.2

      return

    } else if (r < 0.6) {
      let randx = Utils.random() * 0.5 + 0.5;
      let randz = Utils.random() * 0.5 + 0.5;

      s.meshname = 'cube'
      let ys = 1.2 * Utils.random()
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz
      //s.symbol = 'start'

      return

    } else {
      s.meshname = 'shrub1'
      s.position[1] = 0

      s.scale[0] *= 0.2 + Utils.random() * 0.2
      s.scale[1] *= 0.2 + Utils.random() * 0.2
      s.scale[2] *= 0.2 + Utils.random() * 0.2
      s.tex_cell = TexCell.TREETRUNK1
      s.flip_uvy = true
      s.global_tex = true
      return
    }

  }

  static scaleAboutAnchor(p: vec3, anchor: vec3, scale: vec3) {
    let invAnchor = vec3.create()
    vec3.scale(invAnchor, anchor, -1)
    let s = mat4.create()

    mat4.translate(s, s, anchor)
    mat4.scale(s, s, scale)
    mat4.translate(s, s, invAnchor)

    vec3.transformMat4(p, p, s)
  }


  static placeAlongVectorIntervals(intervals: Array<number>, widthMin: number, widthVar: number, p1: vec3, dir: vec3, pad: number, res: Array<ShapeNode>) {
    let xaxis = vec3.fromValues(1, 0, 0)

    let xz = vec2.fromValues(dir[0], dir[2])
    let xax2 = vec2.fromValues(1, 0)

    let o = Math.sign(Utils.crossVec2(xz, xax2))
    let rot = vec3.angle(xaxis, dir)

    if (o == -1) {
      rot *= -1
    }

    let angle = Utils.radiansToDegrees(rot);

    let look = vec3.fromValues(0, 0, 1)
    vec3.rotateY(look, look, vec3.create(), rot)

    for (let j = 0; j < intervals.length - 1; j++) {
      let padded1 = Math.min(intervals[j] + pad, intervals[j + 1])
      let padded2 = Math.max(intervals[j + 1] - pad, padded1)

      let lastp = vec3.create()
      vec3.scaleAndAdd(lastp, p1, dir, padded1)

      let nextp = vec3.create()
      vec3.scaleAndAdd(nextp, p1, dir, padded2)

      let sn = new ShapeNode();
      sn.rotation[1] = angle
      sn.scale[0] = padded2 - padded1
      sn.scale[2] = widthMin

      let sz = j < intervals.length - 2 ? Utils.random() * widthVar : widthVar


      sn.scale[2] += sz
      sn.symbol = 'start'
      vec3.lerp(sn.position, lastp, nextp, 0.5)
      sn.position[1] = 0.5


      vec3.scaleAndAdd(sn.position, sn.position, look, -0.5 * sz)
      res.push(sn)
    }
  }

  static boxFromFace() {

  }

  static boxesAlongEdges(face: Array<GraphVertex>, xzScale: number,
    lengthMin: number, lengthVar: number, widthMin: number, widthVar: number,
    intervalPad: number = 0.08, maxEdgeL : number = Number.MAX_VALUE) {
    let res = new Array<ShapeNode>()

    //if (face.length <= 3) {
      //return res
   // }
    let bb = GraphVertex.boundingBoxFromVerts(face)
    let center = bb.getCenter()
    let center3 = vec3.fromValues(center[0], 0, center[1])
    let overlap = widthMin + widthVar
    for (let i = 0; i < face.length; i++) {
      let p1 = vec3.create()
      vec3.copy(p1, face[i].pos)

      //scale points in face about center of bounding box
      Utils.scaleAboutAnchor(p1, center3, vec3.fromValues(xzScale, 1, xzScale))
      let p2 = vec3.create()
      vec3.copy(p2, face[(i + 1) % face.length].pos);
      Utils.scaleAboutAnchor(p2, center3, vec3.fromValues(xzScale, 1, xzScale))

      let dir = vec3.create()
      vec3.subtract(dir, p2, p1)
      vec3.normalize(dir, dir)
      vec3.scaleAndAdd(p1, p1, dir, overlap * 0.5)

      let length = Math.min(vec3.distance(p1, p2),maxEdgeL)

      let intervals = new Array<number>();

      let currL = 0
      let lastL = lengthMin + Utils.random() * lengthVar

      let num = 0
      while (currL + overlap < length  && currL + lengthMin < length) {
        intervals.push(currL)
        // widthIntervals.push(Utils.random() * (overlap - 0.1))

        if (Utils.random() > 0.5) {
          lastL = lengthMin + Utils.random() * lengthVar

        }
        currL += lastL
      }
      intervals.push(length)

      //console.log("intervals " + intervals)
      ShapeNodeFunctions.placeAlongVectorIntervals(intervals, widthMin, widthVar, p1, dir, intervalPad, res)

    }
    //console.log("res length" + res.length)
    //res.push(parent)
    return res

  }


  ///estimate, floating point error makes it prone to issues
  static orientedPolyPlaneFromQuadPoints(p1 : vec3, p2 : vec3, p3 : vec3, p4 : vec3) {
      let mid = vec3.create()
      vec3.lerp(mid, p1, p2, 0.5)

      //bilinear interpolation to get midpt
      let midpt = Utils.bilinearInterp(p1,p2,p3,p4)
      //cross edges to find normal
      let norm = Utils.calcNormal(p1, p2, p3)

      //get axis of rotation by which to rotate plane
      let aa = Utils.rotateToXZPlane(norm)
      let rot_vec = Utils.xyz(aa)
      let angle = aa[3]

      let q = quat.create()
      quat.setAxisAngle(q, rot_vec,angle)

      //plane is rotated by x axis, so z axis becomes y axis
      let xyPos = new ShapeNode();
      //xyPos.position = midpt
      xyPos.meshname = '';
      xyPos.rotation = Utils.quatToEuler(q)
      xyPos.scale[0] = 0.5
      xyPos.scale[2] = 0.5

        xyPos.rotation[0] = Utils.radiansToDegrees(xyPos.rotation[0])
        xyPos.rotation[1] = Utils.radiansToDegrees(xyPos.rotation[1])
        xyPos.rotation[2] = Utils.radiansToDegrees(xyPos.rotation[2])
      // xyPos.rotation[2] = Utils.radiansToDegrees(rot);
      xyPos.position = midpt

      let xyPlane = new ShapeNode();
      // xyPlane.scale[0] = 0.2
      // xyPlane.scale[2] = 0.2

      quat.setAxisAngle(q, rot_vec, -angle)
      //quat.invert
    // xyPlane.polyplane  = new PolyPlane()

     let transform = mat4.create()
     mat4.fromQuat(transform, q)
     mat4.translate(transform, transform, midpt)
     vec3.subtract(p1,p1, midpt)
     vec3.subtract(p2,p2, midpt)
     vec3.subtract(p3,p3, midpt)
     vec3.subtract(p4,p4, midpt)

     vec3.transformQuat(p1, p1, q)
     vec3.transformQuat(p2, p2, q)
     vec3.transformQuat(p3, p3, q)
     vec3.transformQuat(p4, p4, q)
      xyPlane.meshname = "plane";
      xyPos.addChild(xyPlane);
      // xyPos.copyshallow(s);
      //xyPos.meshname =  "plane";
      //let floorshape = ShapeNodeFunctions.splitAlongLocalPt(xyPlane, 0.9, 2)[1];
      //xyPos.addChild(floorshape);

      xyPos.position[1] = 0;
    return xyPos
  }

  static extrudeAndScaleFace(face: Array<GraphVertex>, height = 1, scale : vec3, excludeTop = false, localSpace = true) {
    let res = new Array<ShapeNode>()
   // center = vec2.create()

    // parent.scale[0] = 0.5
    // parent.scale[2] = 0.5
    let parcel = new Parcel(face)
    let angle = parcel.obb.rot_angle
    parcel.rotateParcelY(-angle)
    parcel.scaleParcelUniformXZ(scale)
    parcel.rotateParcelY(angle)
    let center = parcel.obb.pos

    let parent = new ShapeNode();
    parent.symbol = 'level'
    parent.meshname = ''

    if(!localSpace) {
      parent.position = vec3.fromValues(center[0], face[0].pos[1], center[1])
    }

    for (let i = 0; i < face.length; i++) {
      //transform points to space of center
      let p1 = vec3.fromValues(face[i].pos[0], 0, face[i].pos[2]);
      let p2 = vec3.fromValues(face[(i + 1) % face.length].pos[0], 0, face[(i + 1) % face.length].pos[2]);
      let centertrans = vec3.fromValues(center[0], 0, center[1])
      vec3.subtract(p1, p1, centertrans)
      vec3.subtract(p2, p2, centertrans)

      let p3 = vec3.create()
      vec3.copy(p3,parcel.face[(i + 1) % face.length].pos)
      vec3.subtract(p3, p3, centertrans)
      p3[1] = height

      let p4 = vec3.create()
      vec3.copy(p4, parcel.face[i].pos)
      vec3.subtract(p4, p4, centertrans)
      p4[1] = height

      //plane is rotated by x axis, so z axis becomes y axis
      let xyPos = new ShapeNode();
      //xyPos.position = midpt
      xyPos.meshname = '';
      parent.addChild(xyPos)

      let xyPlane = new ShapeNode();

      //quat.invert
      xyPlane.polyplane  = new PolyPlane()
      xyPlane.polyplane.points.push(Utils.vec3ToVec4(p1,1))
      xyPlane.polyplane.points.push(Utils.vec3ToVec4(p2,1))
      xyPlane.polyplane.points.push(Utils.vec3ToVec4(p3,1))
      xyPlane.polyplane.points.push(Utils.vec3ToVec4(p4,1))

       xyPlane.meshname = ''
      // xyPlane.meshname = "plane";
       xyPos.addChild(xyPlane);

      xyPos.position[1] = 0;
    }

    if (!excludeTop) {
      let top = new ShapeNode()
      top.polyplane = new PolyPlane()
      top.symbol = 'top'
      top.meshname = ''

      for (let i = 0; i < parcel.face.length; i++) {
        top.polyplane.points.push(vec4.fromValues(parcel.face[i].pos[0] - center[0], height, parcel.face[i].pos[2] - center[1], 1))
      }
      parent.addChild(top)

    }

    res.push(parent)
    return res
  }


  static extrudeFace(face: Array<GraphVertex>, height = 1, excludeTop = false) {
    let res = new Array<ShapeNode>()
    let bb = GraphVertex.boundingBoxFromVerts(face)
    let center = bb.getCenter()
    let parent = new ShapeNode();
    parent.position = vec3.fromValues(center[0], 0.5, center[1])
    parent.symbol = 'level'
    parent.meshname = ''
    // parent.scale[0] = 0.5
    // parent.scale[2] = 0.5
    for (let i = 0; i < face.length; i++) {
      let p1 = face[i].pos;
      let p2 = face[(i + 1) % face.length].pos;
      let dir = vec3.create()
      let pos = vec3.create()
      vec3.lerp(pos, p2, p1, 0.5)
      vec3.subtract(pos, pos, parent.position)
      let xaxis = vec3.fromValues(1, 0, 0)

      vec3.subtract(dir, p2, p1)
      let xz = vec2.fromValues(dir[0], dir[2])
      let xax2 = vec2.fromValues(1, 0)
      let length = vec3.length(dir)

      let o = Math.sign(Utils.crossVec2(xz, xax2))
      let rot = vec3.angle(xaxis, dir)

      if (o == 1) {
        rot *= -1
      }


      //plane is rotated by x axis, so z axis becomes y axis
      let xyPos = new ShapeNode();
      xyPos.meshname = '';
      xyPos.rotation[0] = 90;
      xyPos.scale[0] = length;

      xyPos.rotation[2] = Utils.radiansToDegrees(rot);
      xyPos.position = pos
      parent.addChild(xyPos)

      let xyPlane = new ShapeNode();
      xyPlane.meshname = "plane";
      xyPos.addChild(xyPlane);
      // xyPos.copyshallow(s);
      //xyPos.meshname =  "plane";
      //let floorshape = ShapeNodeFunctions.splitAlongLocalPt(xyPlane, 0.9, 2)[1];
      //xyPos.addChild(floorshape);

      xyPos.position[1] = 0;
    }

    if (!excludeTop) {
      let top = new ShapeNode()
      top.polyplane = new PolyPlane()
      top.symbol = 'top'
      top.meshname = ''

      for (let i = 0; i < face.length; i++) {
        top.polyplane.points.push(vec4.fromValues(face[i].pos[0] - center[0], 0.5, face[i].pos[2] - center[1], 1))
      }
      parent.addChild(top)

    }

    res.push(parent)
    return res
  }

  static drawBetweenPoints(s: ShapeNode, p1: vec3, p2: vec3) {
    let dir = vec3.create()
    vec3.subtract(dir, p2, p1)
    vec3.normalize(dir, dir)

    let pos = vec3.create()

    vec3.lerp(pos, p1, p2, 0.5)

    let xaxis = vec3.fromValues(1, 0, 0)
    //console.log("pos " + pos)

    let xz = vec2.fromValues(dir[0], dir[2])
    let xax2 = vec2.fromValues(1, 0)

    let p3p2 = vec3.create()
    vec3.subtract(p3p2, p2, p1)
    let length = vec3.length(p3p2)

    let o = Math.sign(Utils.crossVec2(xz, xax2))
    let rot = vec3.angle(xaxis, dir)

    if (o == -1) {
      rot *= -1
    }

    s.rotation[1] = Utils.radiansToDegrees(rot);
    s.position = pos
    s.scale[0] = length

  }

  static addScaleAboutMinEnd(s: ShapeNode, axis: number, scale: number) {
    let initPos = s.position[axis] - s.scale[axis] * 0.5;
    s.scale[axis] += scale;
    s.position[axis] = initPos + s.scale[axis] * 0.5;
  }

  static setScaleAboutMinEnd(s: ShapeNode, axis: number, scale: number) {
    let initPos = s.position[axis] - s.scale[axis] * 0.5;
    s.scale[axis] = scale;
    s.position[axis] = initPos + s.scale[axis] * 0.5;
  }

  static multScaleAboutMinEnd(s: ShapeNode, axis: number, scale: number) {
    ShapeNodeFunctions.setScaleAboutMinEnd(s, axis, s.scale[axis] * scale)
  }

  static addScaleAboutMaxEnd(s: ShapeNode, axis: number, scale: number) {
    let initPos = s.position[axis] + s.scale[axis] * 0.5;
    s.scale[axis] += scale;
    s.position[axis] = initPos - s.scale[axis] * 0.5;
  }

  static setScaleAboutMaxEnd(s: ShapeNode, axis: number, scale: number) {
    let initPos = s.position[axis] + s.scale[axis] * 0.5;
    s.scale[axis] = scale;
    s.position[axis] = initPos - s.scale[axis] * 0.5;
  }

  static multScaleAboutMaxEnd(s: ShapeNode, axis: number, scale: number) {
    ShapeNodeFunctions.setScaleAboutMaxEnd(s, axis, s.scale[axis] * scale)
  }

  //global is actually parent space of s
  static splitAlongGlobalPt(s: ShapeNode, pt: number, ind: number): Array<ShapeNode> {

    let minpt = s.position[ind] - s.scale[ind] * 0.5;
    let localPt = pt - minpt;
    let frac = localPt / s.scale[ind];

    if (frac > 1 || localPt <= 0) {
      return new Array<ShapeNode>(s);
    }

    return ShapeNodeFunctions.splitAlong(s, frac, ind);
  }

  //split along a point in local space where mincorner of shape is origin
  static splitAlongLocalPt(s: ShapeNode, pt: number, ind: number): Array<ShapeNode> {
    let frac = pt / s.scale[ind];
    if (frac > 1) {
      return new Array<ShapeNode>();
    }

    return ShapeNodeFunctions.splitAlong(s, frac, ind);
  }

  static splitAlong(s: ShapeNode, frac: number, ind: number, copyChildren = false): Array<ShapeNode> {
    let res = new Array<ShapeNode>();
    let xSize = s.scale[ind];
    let xMin = s.position[ind] - xSize * 0.5;
    let left = xMin + frac * xSize * 0.5;
    let right = xMin + frac * xSize + (1 - frac) * xSize * 0.5;
    let dup = new ShapeNode();
    if(copyChildren) {
      dup.copyrecursive(s);

    } else {
      dup.copyshallow(s);

    }
    s.scale[ind] *= frac;
    dup.scale[ind] *= (1 - frac);
    s.position[ind] = left;
    dup.position[ind] = right;
    res.push(s);
    res.push(dup);
    return res;
  }


  static splitAlongSym(s: ShapeNode, frac: number, ind: number): Array<ShapeNode> {
    let res = new Array<ShapeNode>();
    let xSize = s.scale[ind];
    let xMin = s.position[ind] - xSize * 0.5;
    let xMax = s.position[ind] + xSize * 0.5;

    let left = xMin + frac * xSize * 0.5;
    let right = xMax - frac * xSize * 0.5;
    let dupl = new ShapeNode();
    let dupr = new ShapeNode();
    //dupl.meshname = s.meshname;
    //dupr.meshname = s.meshname;

    dupl.copyshallow(s);
    dupr.copyshallow(s);

    s.scale[ind] *= 1 - (2 * frac);
    dupl.scale[ind] *= frac;
    dupl.position[ind] = left;

    dupr.scale[ind] *= frac;
    dupr.position[ind] = right;

    res.push(dupl);
    res.push(s);
    res.push(dupr);

    return res;
  }



  static passThrough(s: ShapeNode): Array<ShapeNode> {
    if (s.depth > 1) {
      s.symbol = "structure"
    }
    return new Array<ShapeNode>(s);
  }

  static stretchRand(s: ShapeNode): Array<ShapeNode> {
    if (s.depth > 1) {
      s.symbol = "structure"
    }
    //let x = Utils.random() * 0.7;
    let y = Utils.random() * 2;
    //let z = Utils.random() * 0.7;

    ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, y);
    return new Array<ShapeNode>(s);
  }

  static roof1(s: ShapeNode): Array<ShapeNode> {
    s.meshname = 'roof1';
    s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);
    return new Array<ShapeNode>(s);
  }


  static roof2(s: ShapeNode): Array<ShapeNode> {
    s.meshname = 'roof2';
    // s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);

    return new Array<ShapeNode>(s);

  }

  static roof3(s: ShapeNode): Array<ShapeNode> {
    s.meshname = 'roof3';
    // s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);
    return new Array<ShapeNode>(s);

  }


  static watertower(s: ShapeNode): Array<ShapeNode> {
    //ensure water tower is not skewed
    // let smin = Math.max(Math.min(s.scale[0], s.scale[2]), 0.1);
    // smin = Utils.clamp(smin, 0.1, 0.2);
    //  s.scale = vec3.fromValues(smin, smin, smin);
    s.meshname = 'watertower';
    s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);
    return new Array<ShapeNode>(s);

  }


  static spire(s: ShapeNode): Array<ShapeNode> {
    //ensure water tower is not skewed
    // let smin = Math.max(Math.min(s.scale[0], s.scale[2]), 0.2);
    // s.scale = vec3.fromValues(smin, smin, smin);
    s.meshname = 'spire';
    s.position[1] = 0
    s.tex_cell = Utils.randomIntRange(TexCell.FACADE1, TexCell.ROOF2);
    return new Array<ShapeNode>(s);

  }


  static spike(s: ShapeNode): Array<ShapeNode> {
    //ensure water tower is not skewed
    //  let smin = Math.max(Math.min(s.scale[0], s.scale[2]), 0.2);
    // s.scale = vec3.fromValues(smin, smin, smin);
    s.meshname = 'spike';
    s.position[1] = 0

    s.tex_cell = Utils.randomIntRange(TexCell.FACADE1, TexCell.ROOF2);
    return new Array<ShapeNode>(s);

  }


  static growYOffsetX(s: ShapeNode): Array<ShapeNode> {
    //console.log("S DEPTH" + s.depth);
    let newChildren = new Array<ShapeNode>()
    newChildren.push(s)
    if (s.depth > 1) {
      s.symbol = "structure"
    }
    let randMat = Utils.randomIntRange(TexCell.FACADE1, TexCell.DOOR1)
    //for(let i =0 ; i< parent.children.length;i++) {
    // let s = parent.children[i]

    let axis = Utils.random() < 0.5 ? 0 : 2;
    let bAxis = axis == 0 ? 2 : 0;

    if (s.scale[axis] > 0.5) {
      let randoff = 0.2 + 0.05 * Utils.random();
      let res = ShapeNodeFunctions.splitAlong(s, randoff, axis);
      let dup = res[1];
      let randy = 0.1 * Utils.random() - 0.2;
      let randb = Utils.random();
      randy = -randy
      ShapeNodeFunctions.addScaleAboutMinEnd(dup, 1, randy)
      s.parent.addChild(dup)
      newChildren.push(dup);
    }
    return newChildren;

  }

  static fracFromWorldSize(s: ShapeNode, size: number, axis: number) {
    return size / s.scale[axis];
  }


  static OffsetYSim(s: ShapeNode): Array<ShapeNode> {
    //console.log("OffsetYSim");
    let newChildren = new Array<ShapeNode>()
    newChildren.push(s)
    let randomMat = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1)
    
    if (s.depth > 1) {
      s.symbol = "structure"
    }
    let axis = Utils.random() < 0.5 ? 0 : 2;
    let sign = Utils.random() < 0.5 ? -1 : 1;

    if (s.scale[axis] > 0.5) {
      let randoff = 0.1 + 0.3 * Utils.random();
      randoff = ShapeNodeFunctions.fracFromWorldSize(s, 0.9 + 0.1 * Utils.random(), axis);
      randoff = Utils.clamp(randoff, 0.15, 0.2);
      let res = ShapeNodeFunctions.splitAlongSym(s, randoff, axis);
      let randy = (Utils.random() * 0.2 + 0.1);
      randy = Utils.clamp(randy, s.scale[1] * 0.1, s.scale[1] * 0.3);
      randy = -randy
      ShapeNodeFunctions.addScaleAboutMinEnd(res[0], 1, randy)
      ShapeNodeFunctions.addScaleAboutMinEnd(res[1], 1, 0)
      ShapeNodeFunctions.addScaleAboutMinEnd(res[2], 1, randy)

      newChildren.push(res[0])
      newChildren.push(res[2])

      s.parent.addChild(res[0])
      s.parent.addChild(res[2])

    }
    return newChildren;

  }


  static offsetYParcel(s: ShapeNode) : Array<ShapeNode> {
    let master = s.getMaster()
    //let block = new Block()
    let long_length = Math.max(s.parcel.obb.extents[0], s.parcel.obb.extents[1])
    if(long_length < 0.18) {
      return new Array<ShapeNode>(s) 
    }
    let off = Utils.randomFloatRange(0.1,0.4)
    s.parcel.splitOBB(off)    
    s.parcel.graph.findFaces()
    let res = new Array<ShapeNode>()

    for(let i = 0; i < s.parcel.graph.faces.length; i++) {

      let face = s.parcel.graph.faces[i]
      let parcel = new Parcel(face)
      let ex = ShapeNodeFunctions.extrudeFace(face)[0]
      ex.depth = s.depth
      if (s.depth >= 0) {
        ex.symbol = 'stack'
        
      } else {
        ex.symbol = s.symbol
      }

      ex.symbol = 'stack'

      let randy = Utils.randomFloatRange(-s.scale[1] * 0.3, -s.scale[1] * 0.1)
      //randy = 0

      ShapeNodeFunctions.setScaleAboutMinEnd(ex, 1, s.scale[1] + randy)
      ex.parcel = parcel

      ex.setTextureForAllChildren(master["lowlod"])
      res.push(ex)
      s.parent.addChild(ex)

    }
    s.parent.removeChild(s)
    
    return res
  }

  static offsetYSimParcel(s: ShapeNode) : Array<ShapeNode> {
    let master = s.getMaster()
    //let block = new Block()
    let res = new Array<ShapeNode>()

    let long_length = Math.max(s.parcel.obb.extents[0], s.parcel.obb.extents[1])
    if(long_length < 0.18) {
      return new Array<ShapeNode>(s) 
    }

    let off = Utils.randomFloatRange(0.1,0.4)
    s.parcel.splitOBBSym(off)    
    s.parcel.graph.findFaces()
    let randy = Utils.randomFloatRange(-s.scale[1] * 0.3, -s.scale[1] * 0.1)

    for(let i = 0; i < s.parcel.graph.faces.length; i++) {

      let face = s.parcel.graph.faces[i]
      let parcel = new Parcel(face)
      let ex = ShapeNodeFunctions.extrudeFace(face)[0]
      ex.depth = s.depth

      if (s.depth >= 0) {
        ex.symbol = 'stack'
        
      } else {
        ex.symbol = s.symbol
      }

      ex.symbol = 'stack'

      ShapeNodeFunctions.setScaleAboutMinEnd(ex, 1, s.scale[1] + randy * ((i+1) % 2))
      ex.parcel = parcel

      ex.setTextureForAllChildren(master["lowlod"])
      res.push(ex)
      s.parent.addChild(ex)

    }
    s.parent.removeChild(s)
    
    return res
  }

  static stackYParcel(s: ShapeNode) {
    let res = ShapeNodeFunctions.splitAlong(s, 0.5, 1, true);
    s.parent.addChild(res[1])
    res[1].scale[0] *= 0.9
    res[1].scale[2] *= 0.9
    res[1].depth = res[0].depth
    if(res[0].depth > 5) {
      res[0].symbol = 'structure'

    } else {
      res[0].symbol = 'stack'
    }
    res[0].symbol = 'structure'

    
    res[1].symbol = 'structure'
    return res
  }

  static extrudeLargestParcelFromTop(s : ShapeNode, parcels : Array<Parcel>) {
    let largest = 0
    let maxArea = -Number.MAX_VALUE
    let top = s.position[1] + s.scale[1] * 0.5

    for(let j = 0; j < parcels.length; j++) {
      let area = parcels[j].obb.getArea()
      if(area > maxArea) {
        maxArea = area
        largest = j
      }

    }

    let split = undefined
    for(let j = 0; j < parcels.length; j++) {
      if(j == largest) {
        split = ShapeNodeFunctions.extrudeFace(parcels[j].face)[0]
        split.position[1] += top
        split.parcel = parcels[j]

      } else {
        s.parcel = parcels[j]
      }
    }
    return split
  }

  static stackSplitOBB(s:ShapeNode) {
    let res = new Array<ShapeNode>(s)
    s.symbol = 'structure'

    let block = new Block()
    block.parcels.push(s.parcel)
    block.subdivideParcels(0.01, -0.3, 0.3, false, 1)
    let split = ShapeNodeFunctions.extrudeLargestParcelFromTop(s, block.parcels)
    ShapeNodeFunctions.setScaleAboutMinEnd(split,1,0.2 * s.scale[1])
    s.parent.addChild(split)
    split.symbol = 'structure'
    res.push(split)

    return res

  }

  static stackScaleExponential(s : ShapeNode) {
    let to_split = s
    s.symbol = 'structure'
    let res = new Array<ShapeNode>(s)
    let rand = 1 + Utils.random() * 2
    let divs = Math.ceil(rand * s.scale[1] / 0.35)
    divs = Utils.clamp(divs, 1, 6)
    for(let i = 0; i < divs; i++) {
      let factor = 0.5
      if(i == 0) {
        factor = 0.7
      }
      let y = to_split.scale[1]
      ShapeNodeFunctions.setScaleAboutMinEnd(to_split,1,y*factor)
      let block = new Block()
      block.parcels.push(to_split.parcel)
      block.scaleParcel(vec3.fromValues(0.75,1.0,0.75))
      let split = ShapeNodeFunctions.extrudeLargestParcelFromTop(to_split, block.parcels)

      if(split !== undefined) {
        ShapeNodeFunctions.setScaleAboutMinEnd(split,1,y * (1-factor))
        to_split = split  
        s.parent.addChild(to_split)
        to_split.symbol = 'structure'
        res.push(to_split)
  
      } else {
        break
      }

    }
    return res

  }

  static stackandOffset(s : ShapeNode) {
    let to_split = s
    s.symbol = 'structure'
    let res = new Array<ShapeNode>(s)
    let angle = 0
    let divs = 6
    let splitVal = 1.0/divs
    let center = s.position
    s.scale[0] *= 0.95
    s.scale[2] *= 0.95

    for(let i = 0; i < divs; i++) {
     // if(to_split.scale[1] > splitVal) {
        angle += Utils.randomFloatRange(20,60)
        let frac = splitVal / to_split.scale[1]
        let split = ShapeNodeFunctions.splitAlong(to_split, frac, 1, true);
        to_split = split[1]
        let randX = Utils.random() * s.scale[0] * 0.05
        let randZ = Utils.random() * s.scale[2] * 0.05
        let y = to_split.position[1]
        vec3.add(to_split.position, s.position, vec3.fromValues(randX, 0, randZ))
        to_split.position[1] = y

        //to_split.position[1] = angle
        to_split.symbol = 'structure'
        s.parent.addChild(to_split)
  
        res.push(to_split)
  
      // } else {
      //   break
      // }

    }
    return res

  }

  static stackAndRotate(s : ShapeNode) {
    let to_split = s
    s.symbol = 'structure'
    let res = new Array<ShapeNode>(s)
    let angle = 0
    let splitVal = Utils.randomFloatRange(0.1, 0.3)
    for(let i = 0; i < 4; i++) {
      if(to_split.scale[1] > splitVal) {
        angle += Utils.randomFloatRange(20,60)
        let frac = splitVal / to_split.scale[1]
        let split = ShapeNodeFunctions.splitAlong(to_split, frac, 1, true);
        to_split = split[1]
        to_split.scale[0] *= 0.9
        to_split.scale[2] *= 0.9
        to_split.rotation[1] = angle
        to_split.symbol = 'structure'
        s.parent.addChild(to_split)
  
        res.push(to_split)
  
      } else {
        break
      }

    }
  //  let res = ShapeNodeFunctions.splitAlong(s, 0.5, 1, true);
    // res[1].scale[0] *= 0.9
    // res[1].scale[2] *= 0.9
    // s.symbol = 'structure'
    // res[1].symbol = 'structure'
    return res

  }

  static extrudedHexagon() {
    let hexagon = new Array<GraphVertex>()
    hexagon.push(new GraphVertex(vec3.fromValues(0.25, 0, -0.433025)))
    hexagon.push(new GraphVertex(vec3.fromValues(-0.25, 0, -0.433025)))
    hexagon.push(new GraphVertex(vec3.fromValues(-0.5, 0, 0)))
    hexagon.push(new GraphVertex(vec3.fromValues(-0.25, 0, 0.433025)))
    hexagon.push(new GraphVertex(vec3.fromValues(0.25, 0, 0.433025)))
    hexagon.push(new GraphVertex(vec3.fromValues(0.5, 0, 0)))

    let parent = ShapeNodeFunctions.extrudeFace(hexagon)[0]

    // let roof = new ShapeNode()
    // roof.polyplane = new PolyPlane()
    // roof.symbol = ''
    // roof.meshname = ''

    // for(let i = 0; i < hexagon.length; i++) {
    //   roof.polyplane.points.push(vec4.fromValues(hexagon[i].pos[0],0.5,hexagon[i].pos[2],1))
    // }

    //parent.addChild(roof)
    return parent
  }


  //creates faces of the cube and adds them as children to node s
  static replaceCubeWithPlanes(s: ShapeNode, excludeTop = false, res: Array<ShapeNode> = undefined) {
    //console.log("replacewplanes");

    //s.symbol = "plane";
    s.meshname = "";
    for (let i = 0; i < 3; i++) {
      //i is the axis of rotation
      //translation axis
      let ti = 1;
      if (i != 1) {
        ti = (i + 2) % 3;
      }
      for (let j = -1; j <= 1; j += 2) {
        if ((i == 1 && j == -1) || (i == 1 && excludeTop)) {
          continue;
        }
        let xyPos = new ShapeNode();
        xyPos.meshname = '';
        xyPos.tex_cell = s.tex_cell

        let xyPlane = new ShapeNode();
        xyPlane.tex_cell = s.tex_cell

        xyPlane.meshname = "plane";
        xyPos.addChild(xyPlane);

        // xyPos.copyshallow(s);
        //xyPos.meshname =  "plane";
        xyPos.position[1] = 0;

        if (i == 0) {
          //xy plane
          let faceRot = j == -1 ? 1 : 0;

          xyPos.rotation[0] = 90;
          xyPos.rotation[2] = 180 * faceRot;

          xyPos.position[2] += j * 0.5;
          xyPos.scale[1] = Math.min(1, 1.0 / s.scale[2]);

        } else if (i == 1) {
          //xz plane
          xyPos.position[1] += j * 0.5;

        } else {
          //yz plane
          let faceRot = j == -1 ? 0 : 1;

          xyPos.rotation[0] = 90;
          xyPos.rotation[2] = 90 + 180 * faceRot;
          xyPos.position[0] += j * 0.5;
          xyPos.scale[1] = Math.min(1, 1.0 / s.scale[0]);

        }
        s.addChild(xyPos);
        if (res !== undefined) {
          res.push(xyPos)
        }
      }
    }

    //console.log(res);
    //return new Array<ShapeNode>(s);
  }

  static largeRoofDecoration(s: ShapeNode): Array<ShapeNode> {
    return undefined
  }

  static extrudeOuterRoofParcel(s : ShapeNode) : Array<ShapeNode> {
    let master = s.getMaster()
    let block = new Block()
    block.parcels.push(s.parcel)
    block.scaleParcel(vec3.fromValues(0.9,1,0.9))
    for(let i = 0; i < block.parcels.length; i++) {
      let parcel = block.parcels[i]
      if(parcel.street_access) {
        let ex = ShapeNodeFunctions.extrudeFace(parcel.face)[0]
        ex.setTextureForAllChildren(master['roof'])
       // ex.position[0] -= s.position[0]
       // ex.position[2] -= s.position[2]
       let top = s.position[1] + s.scale[1] * 0.5

        ex.position[1] += s.position[1] + s.scale[1] * 0.5
        
        ShapeNodeFunctions.setScaleAboutMinEnd(ex, 1, 0.02)
        //ex.scale[1] = 1 / s.scale[1]

        s.parent.addChild(ex)
      } else {
        s.parcel = parcel
      }
    }
    //s.terminal = true
    if(master["lod"] < 0 || master["lod"] > 3) {
      s.symbol = "roof decor"

    } else {
      s.symbol = ''
    }
    //ShapeNodeFunctions.extrudeAndScaleFace(s.parcel.face,0.5, vec3.fromValues(0.1,0,1))
    return new Array<ShapeNode>(s)

  }

  static makeRoofParcel(s: ShapeNode, height = 0.05, scale  = vec3.fromValues(1.0,1.0,1.0)) {
    let master = s.getMaster()
    let ex = ShapeNodeFunctions.extrudeAndScaleFace(s.parcel.face,height, scale)[0]
    //ex.position[1] += s.scale[1] * 0.5 + s.position[1]
    ex.scale[1] = 1 / s.scale[1]
    ex.position[1] = 0

    s.addChild(ex)
    s.terminal = true
    ex.terminal =true
    ex.setTextureForAllChildren(master['roof'])
    s.symbol = ""
    //ShapeNodeFunctions.extrudeAndScaleFace(s.parcel.face,0.5, vec3.fromValues(0.1,0,1))
    return new Array<ShapeNode>(s)

  }

  static flatRoofParcel(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.makeRoofParcel(s, 0.05, vec3.fromValues(0.8, 0, 0.8))

  }

  static spireRoofParcel(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.makeRoofParcel(s, 0.2, vec3.fromValues(0.05,1.0,0.05))

  }
  static decorateRoofParcel(s: ShapeNode): Array<ShapeNode> {
    let master = s.getMaster()

   // console.log("decorateRoof");
    s.symbol = "";
    let g_scale = s.approxGlobalScale()
    let g_pos = s.getGlobalPosition()
    let roofmat = master['facade2']
    s.tex_cell = Utils.random() > 0.5? master['facade1'] : master['roof']
    let res = new Array<ShapeNode>();
    let original_obb = s.parcel.obb
    let block = new Block()
    let ex = ShapeNodeFunctions.extrudeFace(s.parcel.face)[0]
    //s.parent.addChild(ex)
    block.parcels.push(s.parcel)
    block.subdivideParcels(0.01)
    console.log("parcels length " + block.parcels.length)
    s.parcel.splitOBB()
    s.parcel.graph.findFaces()
    for(let i = 0; i < block.parcels.length; i++) {

      let face = block.parcels[i].face
      //et face = s.parcel.graph.faces[i]

      let obb = new OrientedBoundingBox2D()
      obb.getMinimumFromFace(face)

      let dup = new ShapeNode();
      let minS = Math.min(obb.extents[0], obb.extents[1])

      let randY = (Utils.random() + 1.0)
      let xpos = obb.pos[0] - s.position[0]
      let zpos = obb.pos[1] - s.position[2]

      let ss = 0.7
      dup.scale[0] = minS * ss
      // dup.scale[1] = randY
      dup.scale[1] /= g_scale[1] * 15

      dup.scale[2] = minS * ss

      dup.rotation[1] = Utils.radiansToDegrees(obb.rot_angle)
      dup.position[0] = xpos //+ (Utils.random()-0.5) * dx * 0.5
      dup.position[1] = 0
      dup.position[2] = zpos //+ (Utils.random()-0.5) * dz * 0.5

      //dup.position[0] *= ss
      //dup.position[2] *= ss

      dup.tex_cell = roofmat
      ShapeNodeFunctions.randomRoofDecor(dup)
      s.addChild(dup)
      res.push(dup)

    }

    return res;

  }

  static decorateRoof(s: ShapeNode): Array<ShapeNode> {
    let master = s.getMaster()
   // console.log("decorateRoof");
    s.symbol = "";
    let roofmat = master['facade2']
    s.tex_cell = Utils.random() > 0.5? master['facade1'] : master['roof']
    let res = new Array<ShapeNode>();

    let g_scale = s.approxGlobalScale()

    let xDivs = Math.floor(g_scale[0] * 20)
    let zDivs = Math.floor(g_scale[2] * 20)


    let dx = 1 / (xDivs)
    let dz = 1 / (zDivs)

    let xyznorm = vec3.create()
    vec3.copy(xyznorm, g_scale)
    vec3.normalize(xyznorm, xyznorm)
    for (let i = 0; i < xDivs; i++) {
      for (let j = 0; j < zDivs; j++) {

        if (Utils.random() > 0.5) {


          let dup = new ShapeNode();
          let minS = Math.min(dx, dz)

          let randY = (Utils.random() + 1.0)

          //vec3.scale(dup.scale, dup.scale, randS);
          //dup.scale[0] = randx
          // dup.scale[2] = randz
          //ShapeNodeFunctions.setScaleAboutMinEnd(dup, 1, randY)



          let xpos = 0.5 * (2 * i + 1) * dx;
          let zpos = 0.5 * (2 * j + 1) * dz

          let ss = 0.7
          dup.scale[0] = minS * ss
          // dup.scale[1] = randY
          dup.scale[2] = minS * ss

          dup.scale[0] /= xyznorm[0]
          dup.scale[1] /= g_scale[1] * 15
          dup.scale[2] /= xyznorm[2]


          dup.position[0] = xpos - 0.5 //+ (Utils.random()-0.5) * dx * 0.5
          dup.position[1] = dup.scale[1] * 0.5
          dup.position[2] = zpos - 0.5 //+ (Utils.random()-0.5) * dz * 0.5

          dup.position[0] *= ss
          dup.position[2] *= ss

          dup.tex_cell = roofmat
          ShapeNodeFunctions.randomRoofDecor(dup)
          s.addChild(dup)
          res.push(dup)
        }
        //res.push(dup);

      }
    }

    //dup.copyshallow(s);
    //let randS = Utils.random() * 0.2 + 0.5;
    //vec3.scale(dup.scale, dup.scale, randS);

    //dup.position[1] = s.position[1] + s.scale[1] * 0.5 + dup.scale[1] * 0.5; 
    //res.push(dup);

    //let randoff = 0;
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));

    // s.position[1] = s.scale[1] * 0.5; 
    // res.push(s);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static stackPassThrough(s:ShapeNode) : Array<ShapeNode> {
    s.symbol =  "structure"
    return new Array<ShapeNode>(s)
  }

  static stackY(s: ShapeNode): Array<ShapeNode> {
    //console.log("growYOffsetX");
    //console.log("S DEPTH" + s.depth);

    if (s.depth >= 1) {
      s.symbol = "structure"
    }
    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);
    let randS = Utils.random() * 0.4 + 0.5;
    let randY = Utils.random() * 0.1 + 0.1;

    dup.scale[0] *= randS
    dup.scale[1] = randY

    dup.scale[2] *= randS

    vec3.scale(dup.scale, dup.scale, randS);
    dup.position[1] = s.position[1] + s.scale[1] * 0.5 + dup.scale[1] * 0.5;
    res.push(s);
    res.push(dup);
    return res;

  }

  static entranceLevelsRoofPoly(s: ShapeNode): Array<ShapeNode> {
    //console.log("entranceLevelsRoof");
    let master = s.getMaster()
    let res = new Array<ShapeNode>()
    let botrand = 0.1 + Utils.random() * 0.1
    let toprand = 0.02 + Utils.random() * 0.01

    let bottomSize = Utils.clamp(botrand / s.parent.scale[1], 0.05, 1.0);
    let roofSize = Utils.clamp(toprand / s.parent.scale[1], 0.03, 0.06);
      s.meshname = '';
      //s.meshname = 'cube';

      res = ShapeNodeFunctions.splitAlong(s, bottomSize, 1, true);
      res[0].symbol = "entrance";

      res[0].removeChildrenWithSymbol("top")

      res[0].tex_cell = master['facade1']
      res[0].setTextureForAllChildren(master['facade1'])

      if(master['lod'] < 0 || master['lod'] > 3) {
        res[1].symbol = "level";

      } else {
        res[1].symbol = "";
      }
      res[1].setTextureForAllChildren(master['lowlod'])

    //res[1].copyrecursive(s)
      res.push(ShapeNodeFunctions.splitAlong(res[1], 1 - roofSize, 1, true)[1]);
      //res[2].meshname = 'cube'
      res[1].removeChildrenWithSymbol("top")

      res[2].symbol = "roof";

      //res[2].copyrecursive(s)

      res[2].tex_cell = master['roof']
      res[2].setTextureForAllChildren(master['roof'])

      s.parent.addChild(res[1])
      s.parent.addChild(res[2])

    return s.parent.children;
  }



  static entranceLevelsRoof(s: ShapeNode): Array<ShapeNode> {
    // console.log("entranceLevelsRoof");
    let master = s.getMaster()
    //  let initChildrenLength = parent.children.length
    let nextNodes = new Array<ShapeNode>()
    let res = new Array<ShapeNode>()
    // for(let i = 0; i < initChildrenLength; i++) {
    //let s = parent.children[i]
    let bottomSize = Utils.clamp(0.05 / s.parent.scale[1], 0.05, 1.0);
    let roofSize = Utils.clamp(0.03 / s.parent.scale[1], 0.03, 0.06);

    if (bottomSize < 0.5) {
      s.meshname = '';
      //s.meshname = 'cube';
      res = ShapeNodeFunctions.splitAlong(s, bottomSize, 1);
      res[0].symbol = "entrance";
      res[0].tex_cell = master['facade1']
      res[1].symbol = "level";

      res.push(ShapeNodeFunctions.splitAlong(res[1], 1 - roofSize, 1)[1]);
      res[2].meshname = 'cube'
      res[2].symbol = "roof";
      res[2].tex_cell = master['roof']

      res[2].meshname = ShapeNodeFunctions.randomRoof()
      //res[2].meshname = "cube";
      ShapeNodeFunctions.replaceCubeWithPlanes(res[0], true);
      ShapeNodeFunctions.replaceCubeWithPlanes(res[1], true);
      s.parent.addChild(res[0])
      s.parent.addChild(res[1])
      s.parent.addChild(res[2])

    } else {
      res = ShapeNodeFunctions.splitAlong(s, 1 - roofSize, 1)
      res[0].symbol = "entrance";
      res[0].tex_cell = master['facade1']
      res[1].meshname = 'cube'
      res[1].symbol = "roof";
      res[1].tex_cell = master['roof']
      res[1].meshname = ShapeNodeFunctions.randomRoof()
      ShapeNodeFunctions.replaceCubeWithPlanes(res[0], true);
      s.parent.addChild(res[0])
      s.parent.addChild(res[1])


    }

    // ShapeNodeFunctions.replaceCubeWithPlanes(res[2], false);
    //}
    return s.parent.children;
  }



  static entranceLevelsRoofHexagon(s: ShapeNode): Array<ShapeNode> {
    // console.log("entranceLevelsRoof");
    let master = s.getMaster()
    let bottomSize = Utils.clamp(0.05 / s.parent.scale[1], 0.05, 1.0);
    let roofSize = Utils.clamp(0.03 / s.parent.scale[1], 0.03, 0.06);

    s.meshname = '';

    let res = new Array<ShapeNode>()

    let entrance: ShapeNode
    let level: ShapeNode
    let roof: ShapeNode

    if (bottomSize < 0.5) {
      res = ShapeNodeFunctions.splitAlong(s, bottomSize, 1);
      entrance = res[0]
      level = res[1]
      roof = ShapeNodeFunctions.splitAlong(level, 1 - roofSize, 1)[1]

    } else {
      res = ShapeNodeFunctions.splitAlong(s, 1 - roofSize, 1)
      entrance = res[0]
      roof = res[1]
      level = undefined
    }

    entrance.symbol = "entrance";
    entrance.tex_cell = master['facade1']

    if (level !== undefined) {
      level.symbol = "level";

    }

    roof.meshname = ''
    roof.symbol = "roof";

    let hexagon1 = ShapeNodeFunctions.extrudedHexagon()
    let hexagon2 = ShapeNodeFunctions.extrudedHexagon()
    let roofhex = ShapeNodeFunctions.extrudedHexagon()

    let roofmat = master['facade1']
    for (let p = 0; p < hexagon1.children.length; p++) {
      if (p < hexagon1.children.length - 1) {
        entrance.addChild(hexagon1.children[p])
        hexagon1.children[p].tex_cell = roofmat
        hexagon1.tex_cell = roofmat

        if (level !== undefined) {
          hexagon2.children[p].tex_cell = roofmat
          hexagon2.tex_cell = roofmat
          level.addChild(hexagon2.children[p])

        }

      }
      for (let c = 0; c < roofhex.children[p].children.length; c++) {
        roofhex.children[p].children[c].tex_cell = roofmat
      }
      roofhex.children[p].tex_cell = roofmat
      roofhex.children[p].symbol = ''
      roof.addChild(roofhex.children[p])
    }

    roof.tex_cell = roofmat

    s.parent.addChild(entrance)
    entrance.tex_cell = roofmat

    if (level !== undefined) {
      s.parent.addChild(level)
      level.tex_cell = roofmat

    }
    s.parent.addChild(roof)

    return s.parent.children;
  }

  static divBottomFloor(s: ShapeNode): Array<ShapeNode> {
    //console.log("divbottomfloor");
    s.symbol = "door";
    //return ShapeNodeFunctions.divUniformRandomSize(s, 0.1, 0.05, s.scale[1] + 20, 0.0);
    return ShapeNodeFunctions.divUniformRandomSize(s, 0.1, 0.05, s.scale[1] + 20, 0.0);
  }

  //input is shapenode containing planar subdivisions
  static dividePlaneUniform(plane: ShapeNode, divs: number, axis: number) {
    //console.log("DIVIDE PLANE UNIFORM");  
    let res = new Array<ShapeNode>();
    let d = 1 / divs;

    let newChildren = new Array<ShapeNode>();
    for (let i = 0; i < plane.children.length; i++) {
      let lastShape = plane.children[i];
      for (let k = 1; k < divs; k++) {
        let split = ShapeNodeFunctions.splitAlongGlobalPt(lastShape, -0.5 + k * d, axis);
        if (split.length > 1) {
          split[1].symbol = plane.children[i].symbol;
          split[1].tex_cell = plane.children[i].tex_cell;

          newChildren.push(split[1]);
          lastShape = split[1];
        }
      }
    }
    plane.children = plane.children.concat(newChildren);
    return res;
  }

  //input is plane shapenode whose children are the planar subdivisions
  static dividePlaneNonUniform(plane: ShapeNode, divs: number, axis: number) {
    //console.log("DIVIDE PLANE NONUNIFORM");  
    let res = new Array<ShapeNode>();
    let d = 1.0 / divs;

    let intervals = new Array<number>();
    for (let k = 0; k < divs - 1; k++) {
      let pt = Utils.randomFloatRange(d * 0.5, d);
      intervals.push(pt);
    }

    let newChildren = new Array<ShapeNode>();
    for (let i = 0; i < plane.children.length; i++) {
      let lastShape = plane.children[i];
      for (let k = 0; k < intervals.length; k++) {

        lastShape = ShapeNodeFunctions.splitAlongLocalPt(lastShape, intervals[k], axis)[1];
        if (lastShape == undefined) {
          break;
        }
        lastShape.symbol = plane.children[i].symbol;
        lastShape.tex_cell = plane.children[i].tex_cell;

        newChildren.push(lastShape);
      }
    }

    plane.children = plane.children.concat(newChildren);
    return res;
  }

  //takes in plane child
  static dividePlane(s: ShapeNode, xDivs: number, yDivs: number) {
    //console.log("DIVIDE PLANE");  
    //plane is originally in xz plane
    let res = new Array<ShapeNode>();
    let d = vec3.fromValues(s.scale[0] / xDivs, 1, s.scale[2] / yDivs);
    let minCorner = vec3.fromValues(-s.scale[0] * 0.5 + d[0] * 0.5, 0, -s.scale[2] * 0.5 + d[2] * 0.5);
    vec3.add(minCorner, minCorner, s.position);
    for (let i = 0; i < xDivs; i++) {
      for (let j = 0; j < yDivs; j++) {
        if (i == 0 && j == 0) {
          vec3.copy(s.scale, d);
          vec3.add(s.position, minCorner, vec3.fromValues(d[0] * i, 0, d[2] * j));
        } else {
          let dup = new ShapeNode();
          dup.meshname = s.meshname;
          dup.symbol = s.symbol;
          dup.tex_cell = s.tex_cell;
          vec3.copy(dup.scale, d);
          vec3.add(dup.position, minCorner, vec3.fromValues(d[0] * i, 0, d[2] * j));
          res.push(dup);

        }
      }
    }
    return res;
  }

  static divNonUniformScale(s: ShapeNode): Array<ShapeNode> {
    //let g_scale = s.approxGlobalScale()
    let g_scale = s.scale

    //iterate through planar children
    for (let i = 0; i < s.children.length; i++) {
      let div = Math.max(1,Math.ceil(g_scale[0] * s.children[i].scale[0] * this.windowFactor));
      let yDiv = Math.max(1,Math.ceil(g_scale[1] * s.children[i].scale[2] * this.windowFactor));

      ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], div, 0);
      ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], yDiv, 2);

    }

    return new Array<ShapeNode>(s);
  }


  //xmin, xvar: minimum size of an x subdivision, range on this min size
  //ymin, yvar: minimum size of a y subdivision, range on this min size

  static divUniformRandomSize(s: ShapeNode, xMin: number, xVar: number, yMin: number, yVar: number): Array<ShapeNode> {
    let g_scale = s.approxGlobalScale()
    let windowX = xMin + xVar * Utils.random();
    let windowY = yMin + yVar * Utils.random();

    for (let i = 0; i < s.children.length; i++) {
      let div = Math.max(1,Math.ceil(g_scale[0] * s.children[i].scale[0] / windowX));
      let yDiv = Math.max(1,Math.ceil(g_scale[1] * s.children[i].scale[2] / windowY));

      ShapeNodeFunctions.dividePlaneUniform(s.children[i], div, 0);
      ShapeNodeFunctions.dividePlaneUniform(s.children[i], yDiv, 2);

    }
    return new Array<ShapeNode>(s);
  }


  static divPlaneUniform(s: ShapeNode): Array<ShapeNode> {
    //console.log("divHalvePlane");
    s.symbol = 'facade';

    return ShapeNodeFunctions.divUniformRandomSize(s, 1 / ShapeNodeFunctions.windowFactor, 0.05, 1 / ShapeNodeFunctions.windowFactor, 0.05);
  }


  static divPlaneNonUniform(s: ShapeNode): Array<ShapeNode> {
    //console.log("divHalvePlane");
    s.symbol = 'facade';

    return ShapeNodeFunctions.divNonUniformScale(s);
  }


  static glassFacadePlane(s: ShapeNode): Array<ShapeNode> {
    let master = s.getMaster()
    s.symbol = 'subdivA';
    s.meshname = 'plane';
    //s.terminal = true;
    let sameFacade = Utils.random() < 0.7
    let randF = master['facade1']//Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1);
    let randF2 = master['facade2']
    let window = master['window']

    let glb_scale = s.approxGlobalScale()

    for (let i = 0; i < s.children.length; i++) {
      let newChildren = new Array<ShapeNode>();
      /*
      if(!sameFacade) {
         randF = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1);
         randF2 = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1);
  
      }*/
      for (let j = 0; j < s.children[i].children.length; j++) {
        let shp = s.children[i].children[j];
        shp.symbol = 'plane';
        shp.meshname = '';

        shp.tex_cell = TexCell.ROOF1;
        s.children[i].meshname = 'plane';
        let randdiv = Utils.randomIntRange(1, 5);

        if (glb_scale[1] < 0.4 || Utils.random() < 0.6) {
          randdiv = 1
        }

        let div = ShapeNodeFunctions.dividePlane(shp, 1, randdiv);

        div.push(shp)
        let pillarsize = Utils.random() > 0.5 ? 0 : Utils.random() * 0.1
        for (let d = 0; d < div.length; d++) {
          let splitSize = Utils.randomFloatRange(0.05, 0.1);
          let r = ShapeNodeFunctions.splitAlong(div[d], 1 - splitSize, 2);
          r[1].tex_cell = randF2;
          r[1].symbol = 'pillar';
          r[0].tex_cell = window;
          r[0].meshname = 'plane';

          r[0].position[1] = 0.01

          if (pillarsize > 0) {
            let rx = ShapeNodeFunctions.splitAlongSym(r[0], pillarsize, 0);
            rx[0].symbol = 'pillar'
            rx[0].tex_cell = randF
            rx[0].meshname = 'plane'
            rx[0].position[1] = 0.001

            rx[2].tex_cell = randF
            rx[2].symbol = 'pillar'
            rx[2].meshname = 'plane'
            rx[2].position[1] = 0.001

            newChildren.push(rx[0])
            newChildren.push(rx[2])

          }

          newChildren.push(r[1])
          if (div[d] !== shp) {
            newChildren.push(r[0])
          }
        }

      }
      s.children[i].children = s.children[i].children.concat(newChildren)
    }

    return new Array<ShapeNode>(s);

  }

  static divFacadePlaneSym(s: ShapeNode): Array<ShapeNode> {
    //console.log("divFacadePlane");
    let master = s.getMaster()
    s.symbol = 'subdivA';
    s.meshname = '';
    //s.terminal = true;
    let randF = master['lowlod']//Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1);
    let randF2 = master['facade2']

    let glb_scale = s.approxGlobalScale()
    for (let i = 0; i < s.children.length; i++) {
      let newChildren = new Array<ShapeNode>();
      for (let j = 0; j < s.children[i].children.length; j++) {
        let shp = s.children[i].children[j];
        shp.symbol = '';
        shp.meshname = '';

        shp.tex_cell = TexCell.ROOF1;
        s.children[i].meshname = ''
        s.children[i].tex_cell = randF;
        //shp.position[1] = 0.0;
        //newChildren.push(shp); 
        let randdiv = Utils.randomIntRange(1, 5);

        if (glb_scale[1] < 0.4 || Utils.random() < 0.6) {
          randdiv = 1
        }

        let div = ShapeNodeFunctions.dividePlane(shp, 1, randdiv);


        div.push(shp)
        let splitSize = Utils.randomFloatRange(0.05, 0.1);
        let pillarsize = Utils.random() * 0.2

        for (let d = 0; d < div.length; d++) {
          //newChildren.push(div[d]);
          //div[d].tex_cell = randF;
          let r = ShapeNodeFunctions.splitAlong(div[d], 1 - splitSize, 2);
          r[1].tex_cell = randF2;
          r[1].symbol = 'pillar';
          r[1].meshname = 'extrudeplane';
          r[1].scale[1] = 0.2
          r[1].position[1] = 0.001

          let r1_gscale = r[1].approxGlobalScale()
          r[0].symbol = 'window cell';
          r[0].tex_cell = randF;

          let rx = ShapeNodeFunctions.splitAlongSym(r[0], pillarsize, 0);
          rx[0].symbol = 'pillar'
          rx[0].position[1] = 0.001
          rx[0].tex_cell = Utils.random() > 0.5? randF : randF2
          rx[0].meshname = 'plane'
          rx[0].setTextureForAllChildren(randF2)


          rx[2].position[1] = 0.001

          rx[2].tex_cell = rx[0].tex_cell

          rx[2].symbol = 'pillar'
          rx[2].meshname = 'plane'
          newChildren.push(rx[0])
          newChildren.push(rx[2])
          //r[0].meshname = 'window3';
          r[0].meshname = 'plane';

          newChildren.push(r[1])

          //newChildren.push(r[2])

          if (div[d] !== shp) {
            newChildren.push(r[0])
          }
        }

        // console.log(s.children[i]);
      }
      s.children[i].children = s.children[i].children.concat(newChildren)
    }

    return new Array<ShapeNode>(s);

  }

  static divFacadePlaneNonSym(s: ShapeNode): Array<ShapeNode> {
    //console.log("divFacadePlane");
    s.symbol = 'subdivA';
    s.meshname = '';
    //s.terminal = true;

    for (let i = 0; i < s.children.length; i++) {
      let shp = new ShapeNode();
      shp.symbol = 'plane';
      shp.meshname = 'plane';

      shp.tex_cell = TexCell.ROOF1;
      s.children[i].meshname = '';

      //shp.position[1] = 0.0;
      let r = ShapeNodeFunctions.splitAlong(shp, 0.2, 0);
      r[0].symbol = 'pillar';
      r[1].symbol = 'window cell';

      s.children[i].addChild(r[1])

    }

    return new Array<ShapeNode>(s);

  }



  static shrinkStretch(s: ShapeNode): Array<ShapeNode> {
    console.log("shrinkStretch");

    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);
    let randoff = (Utils.random() - 0.5) * dup.scale[2];
    vec3.add(dup.scale, dup.scale, vec3.fromValues(-0.1, 1.0, -0.1));
    vec3.add(dup.position, dup.position, vec3.fromValues(0.0, 0.0, 0.0));
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static scatterWindow1(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s);
  }


  static scatterWindow2(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s);
  }

  static scatterWindows(s: ShapeNode): Array<ShapeNode> {
     //console.log("scatterWindows");
    s.symbol = 'window';
    s.terminal = true;
    let master = s.getMaster()
    let randWind = master['window']
    let facade = master['facade1']

    for (let i = 0; i < s.children.length; i++) {
      let randXScale = 0.5 + 0.2 * Utils.random();
      let randZScale = 0.5 + 0.2 * Utils.random();

      for (let j = 0; j < s.children[i].children.length; j++) {
        if (s.children[i].children[j].symbol == 'window cell') {
          let wind = new ShapeNode();
          wind.position[1] = 0.001;
          wind.meshname = 'plane';
          wind.tex_cell = randWind;
          wind.scale[0] = randXScale;
          wind.scale[2] = randZScale;
          s.children[i].children[j].tex_cell = facade
          s.children[i].children[j].addChild(wind);//windowName;
        }
      }

    }
    return new Array<ShapeNode>(s);

  }

  static uniformWindows(s: ShapeNode, windowName: string, windowTex: TexCell = 0): Array<ShapeNode> {
    //console.log("addWindows");
    s.symbol = 'window';
    s.terminal = true;
    let randWind = Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW3 + 1);

    for (let i = 0; i < s.children.length; i++) {
      for (let j = 0; j < s.children[i].children.length; j++) {
        let wind = new ShapeNode();
        wind.position[1] = 0.001;
        wind.meshname = 'plane';
        wind.tex_cell = randWind;
        wind.scale[0] = 0.8;
        wind.scale[2] = 0.8;

        s.children[i].children[j].addChild(wind);//windowName;
      }
    }
    return new Array<ShapeNode>(s);
  }



  static halve(s: ShapeNode): Array<ShapeNode> {
    // console.log("halve");
    if (s.depth > 1) {
      s.symbol = "structure"
    }
    return ShapeNodeFunctions.splitAlong(s, 0.7, 0);
  }


  static door5(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s);
  }

  static addDoor(s: ShapeNode): Array<ShapeNode> {
    // console.log("addDoor");
    s.symbol = 'door';
    s.terminal = true;
    let master = s.getMaster()
    //s.meshname = 'door1';
    for (let i = 0; i < s.children.length; i++) {
      let randInd = Math.floor(Utils.random() * s.children[i].children.length);
      let randWind = Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW3 + 1);
      let door = Utils.randomIntRange(TexCell.DOOR1, TexCell.DOOR2 + 1);
      s.children[i].meshname = 'plane'
      for (let j = 0; j < s.children[i].children.length; j++) {

        if (j !== randInd) {
          s.children[i].children[j].meshname = 'plane';
          s.children[i].children[j].tex_cell = master['door'];
          s.children[i].children[j].position[1] = 0.001;

        } else {
          let wind = new ShapeNode();
          wind.position[1] = 0.001;
          wind.meshname = 'plane';
          wind.tex_cell = randWind;
          s.children[i].children[j].meshname = '';
          s.children[i].children[j].addChild(wind)
        }
      }
    }
    return new Array<ShapeNode>(s);
  }
}


class ShapeGrammar {

  //represents approximately the minimum width of a building
  m_size: number
  blocks : number
  m_roads: Roads
  axiom: string;
  buffer: ArrayBuffer;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  iterations: number;
  center: vec4;
  shapes: Array<ShapeNode>;
  meshes: Array<Mesh>;
  fullMesh: Mesh;
  randomColor: boolean;
  meshNames: Map<string, Mesh>;
  root: ShapeNode
  gridDivs: number;
  charExpansions: Map<string, string>;
  symbolsToRules: Map<string, Array<FreqPair>>;
  expandedSentence: string;
  cell_size: number;
  orientRand: number;
  finishedLoading : boolean;
  major_freq : number;
  minor_freq : number;
  perlin_scale : number;
  all_blocks:boolean;
  buildings_only : boolean;
  window_freq:number;
  cam_pos : vec3
  min_building_height : number
  max_building_height : number
  height_noise : number
  center_size : number
  constructor() {
    this.axiom = "X";
    this.shapes = new Array<ShapeNode>();
    this.meshes = new Array<Mesh>();
    this.root = new ShapeNode()
    this.iterations = 3;
    this.charExpansions = new Map();
    this.symbolsToRules = new Map();
    this.expandedSentence = "";
    this.orientRand = 0;
    this.fullMesh = new Mesh("", vec3.fromValues(0, 0, 0));
    this.randomColor = false;
    this.cell_size = 4;
    this.gridDivs = 3;
    this.major_freq = 1.0
    this.minor_freq = 1.0
    this.all_blocks = false;
    this.finishedLoading = false;
    this.m_size = 0.1
    this.blocks = 0
    this.buildings_only = false;
    this.cam_pos = vec3.create()
    this.center_size = 0.3
    this.min_building_height = 0.3
    this.max_building_height = 0.65
    this.height_noise = 1.5

    this.fillStartList();
    this.fillStructureList();
    this.fillStackList();
    this.fillRoofList();
    this.fillRoofDecorationList();
    this.fillFacadeSubdivList();
    this.fillPlaneSubdivList();
    this.fillWindowList();
    this.fillEntranceList();
    this.fillDoorList();

  }


  refreshGrammar() {
    this.fillAxiom();
  // this.fillSimpleAxiom();

    this.fillMeshNames();

  }

  parcelToBoundingBox(parcel : Parcel) {
    let res = new Array<ShapeNode>()

    let obb = parcel.obb
    let center = obb.pos// bb.getCenter()
    let parent = new ShapeNode();
    parent.position = vec3.fromValues(center[0], 0.5, center[1])
    parent.symbol = 'start'

    if (parcel.face.length >= 2) {
      parent.rotation[1] = Utils.radiansToDegrees(obb.rot_angle)
    }
    //console.log('parent rot ' + parent.rotation)
    res.push(parent)
    parent.scale[0] = obb.extents[0] * 0.8
    parent.scale[2] = obb.extents[1] * 0.8

    return res

  }

  faceToBoundingBox(face: Array<GraphVertex>) {
    let res = new Array<ShapeNode>()
    let obb = new OrientedBoundingBox2D()
    obb.getMinimumFromFace(face)
    let center = obb.pos// bb.getCenter()
    let parent = new ShapeNode();
    parent.position = vec3.fromValues(center[0], 0.5, center[1])
    parent.symbol = 'start'

    if (face.length >= 2) {
      parent.rotation[1] = Utils.radiansToDegrees(obb.rot_angle)
    }
    //console.log('parent rot ' + parent.rotation)
    res.push(parent)
    parent.scale[0] = obb.extents[0] * 0.66
    parent.scale[2] = obb.extents[1] * 0.66

    return res
  }

  roundCorners(face: Array<GraphVertex>) {
    let res = new Array<GraphVertex>()
    for (let i = 0; i < face.length; i++) {
      let p0 = Utils.copyVec3(face[i].pos)
      let p1 = Utils.copyVec3(face[(i + 1) % face.length].pos)
      let p2 = Utils.copyVec3(face[(i + 2) % face.length].pos)

      let v1 = vec3.create()
      vec3.subtract(v1, p0, p1)
      vec3.normalize(v1, v1)

      let v2 = vec3.create()
      vec3.subtract(v2, p2, p1)
      vec3.normalize(v2, v2)

      let c_dir = vec3.create()
      vec3.lerp(c_dir, v1, v2, 0.5)

      let r1 = vec3.create()
      vec3.scaleAndAdd(r1, p1, v1, 0.1)

      let r2 = vec3.create()
      vec3.scaleAndAdd(r2, p1, v2, 0.1)

      let circle_center = vec3.create()
      vec3.scaleAndAdd(circle_center, p1, c_dir, 0.25)

      let c1 = vec3.create()
      vec3.subtract(c1, r1, circle_center)
      let length = vec3.length(c1)
      vec3.normalize(c1, c1)

      let c2 = vec3.create()
      vec3.subtract(c2, r2, circle_center)
      vec3.normalize(c2, c2)

      let divs = 5

      for (let i = 0; i <= divs; i++) {

        let rlerp = vec3.create()
        vec3.lerp(rlerp, r1, r2, i / divs)

        let s1 = vec3.create()
        vec3.subtract(s1, rlerp, circle_center)
        vec3.normalize(s1, s1)
        vec3.scaleAndAdd(s1, circle_center, s1, length)

        res.push(new GraphVertex(s1))

      }
    }

   //.log("round res ")

    //for (let i = 0; i < res.length; i++) {
      //console.log("vert " + i + " " + res[i].pos)


    //}
    return res
  }

  drawPlaneBetween(p1: vec3, p2: vec3, crossVec: vec3, width: number, y: number = 0) {

    let planemesh = new Plane()
    let f1 = new Array<vec4>()
    f1.push(vec4.fromValues(p1[0], y, p1[2], 1))
    f1.push(vec4.fromValues(p2[0], y, p2[2], 1))
    f1.push(vec4.fromValues(p2[0] + crossVec[0] * width, y, p2[2] + crossVec[2] * width, 1))
    f1.push(vec4.fromValues(p1[0] + crossVec[0] * width, y, p1[2] + crossVec[2] * width, 1))

    let orient = 0;
    for (let i = 0; i < f1.length; i++) {
      let p1 = f1[i]
      let p2 = f1[(i + 1) % f1.length]
      orient += (p2[0] - p1[0]) * (p2[2] + p1[2])
    }

    if (orient > 0) {
      planemesh.p1 = f1[0]
      planemesh.p2 = f1[1]
      planemesh.p3 = f1[2]
      planemesh.p4 = f1[3]

    } else {
      planemesh.p1 = f1[1]
      planemesh.p2 = f1[0]
      planemesh.p3 = f1[3]
      planemesh.p4 = f1[2]

    }

    return planemesh
  }

  drawPlaneBetweenbad(p1: vec3, p2: vec3, crossVec: vec3, width: number, y: number = 0) {
    let planemesh = new Plane()
    planemesh.p1 = vec4.fromValues(p1[0], y, p1[2], 1)
    planemesh.p2 = vec4.fromValues(p1[0] + crossVec[0] * width, y, p1[2] + crossVec[2] * width, 1)
    planemesh.p3 = vec4.fromValues(p2[0] + crossVec[0] * width, y, p2[2] + crossVec[2] * width, 1)
    planemesh.p4 = vec4.fromValues(p2[0], y, p2[2], 1)
    return planemesh
  }


  drawPlaneAlongVectors(p1: vec3, v1: vec3, length: number, v2: vec3, width: number, y = 0) {
    let p2 = vec3.create()
    vec3.scaleAndAdd(p2, p1, v1, length)
    let plane = this.drawPlaneBetween(p1, p2, v2, width, y)
    return plane
  }




  drawGround() {
    for (let i = 0; i < this.m_roads.road_graph.faces.length; i++) {
      let face = this.m_roads.road_graph.faces[i]
      let planemesh = new PolyPlane()
      //console.log("FACE " + i)
      for (let j = 0; j < face.length; j++) {
        let point = Utils.vec3ToVec4(face[j].pos, 1);
        let point2 = Utils.vec3ToVec4(face[(j + 1) % face.length].pos, 1);
        point2[1] = -0.001;
        point[1] = -0.001;
        planemesh.points.push(point)
       // console.log(face[j].id)

        let pl = new PolyPlane()

        let p3 = vec4.create()
        vec4.copy(p3, point2)
        p3[1] = -0.001
        let p4 = vec4.create()
        vec4.copy(p4, point)
        p4[1] = -0.001

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

  drawVertex(v1:GraphVertex, y = 0) {
    let offset = vec3.fromValues(v1.pos[0], 0.01 + v1.id * 0.01, v1.pos[2])
    let tran = new Mesh('/geo/plane.obj', offset, vec3.fromValues(0.05,0.05 + v1.id * 10,0.05), vec3.fromValues(0,0,0))
    let p1mesh = new Plane('/geo/plane.obj')
    p1mesh.m_color = vec4.fromValues(0.1,0.3 * (v1.id - 20),0.1,1)
    p1mesh.loadMesh();
    this.fullMesh.transformAndAppend(p1mesh, tran);

  }


  drawRoadEdges() {
    let i = 0;

    this.m_roads.road_graph.adjList.forEach((neighbors, v1: GraphVertex) => {
      neighbors.forEach((v2: GraphVertex) => {
        this.drawVertex(v1, i)
        this.drawVertex(v2, i)
        i++;
        let segVec = vec3.create()
        vec3.subtract(segVec, v2.pos, v1.pos);
        vec3.normalize(segVec, segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0, 1, 0), segVec)
        vec3.normalize(crossVec, crossVec);

        let v1_off = vec3.create()
        vec3.scaleAndAdd(v1_off, v1.pos, segVec, 0.25)

        let v2_off = vec3.create()
        vec3.scaleAndAdd(v2_off, v2.pos, segVec, -0.25)

        let y = 0.1 * i
        //let y = 0.00001 * i

        let planemesh = this.drawPlaneBetween(v1.pos, v2.pos, crossVec, 0.05, y)
        planemesh.m_color = vec4.fromValues(0.1, 0.1, 0.1, 1)
        planemesh.uv_cell = TexCell.ROAD1
        //planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
        this.fullMesh.transformAndAppend(planemesh, planemesh);

      });
    });

  }

  drawRoads() {
    let i = 0;

    this.m_roads.road_graph.adjList.forEach((neighbors, v1: GraphVertex) => {
      neighbors.forEach((v2: GraphVertex) => {
        i++;
        let segVec = vec3.create()
        vec3.subtract(segVec, v2.pos, v1.pos);
        vec3.normalize(segVec, segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0, 1, 0), segVec)
        vec3.normalize(crossVec, crossVec);

        let v1_off = vec3.create()
        vec3.scaleAndAdd(v1_off, v1.pos, segVec, 0.25)

        let v2_off = vec3.create()
        vec3.scaleAndAdd(v2_off, v2.pos, segVec, -0.25)

        let y = 0.00001 * i

        let planemesh = this.drawPlaneBetween(v1.pos, v2.pos, crossVec, 0.2, y)
        planemesh.m_color = vec4.fromValues(0.1, 0.1, 0.1, 1)
        planemesh.uv_cell = TexCell.ROAD1
        //planemesh.m_color = Utils.randomColor()
        planemesh.loadMesh();
        this.fullMesh.transformAndAppend(planemesh, planemesh);

        let crosswalk1 = this.drawPlaneAlongVectors(v1_off, crossVec, -0.1, segVec, 0.1, 0.0004 + y)
        crosswalk1.uv_cell = TexCell.ROAD2
        crosswalk1.loadMesh();
        this.fullMesh.transformAndAppend(crosswalk1, crosswalk1);

        let crosswalk2 = this.drawPlaneAlongVectors(v2_off, crossVec, -0.1, segVec, -0.1, 0.0004 + y)
        crosswalk2.uv_cell = TexCell.ROAD2
        crosswalk2.loadMesh();
        this.fullMesh.transformAndAppend(crosswalk2, crosswalk2);



        if (Utils.random() > 0.3) {
          for (let i = 0; i < 2; i++) {
            let lines_end1 = vec3.create()
            vec3.scaleAndAdd(lines_end1, v1_off, segVec, 0.1)
            let lines_end2 = vec3.create()
            vec3.scaleAndAdd(lines_end2, v2_off, segVec, -0.1)

            vec3.scaleAndAdd(lines_end1, lines_end1, crossVec, -0.02 - 0.04 * i)
            vec3.scaleAndAdd(lines_end2, lines_end2, crossVec, -0.02 - 0.04 * i)

            let roadlines1 = this.drawPlaneBetween(lines_end1, lines_end2, crossVec, 0.004, 0.0002 + y)
            roadlines1.uv_cell = Utils.randomIntRange(TexCell.ROAD3, TexCell.ROADYELLOW + 1)
            roadlines1.loadMesh();
            this.fullMesh.transformAndAppend(roadlines1, roadlines1);
          }
        }


      });
    });
  }

  makeRandomTree(s : ShapeNode) {
    s.position[1] += -0.01
    let lastDig = Utils.randomIntRange(1,4)
    s.meshname = 'tree' + lastDig
    //console.log("lastdig " + lastDig)
    s.tex_cell = TexCell.TREETRUNK1
    s.rotation[1] = 180 * Utils.random()
    s.flip_uvy = true
    s.global_tex = true

    ShapeNodeFunctions.setScaleAboutMinEnd(s, 1, this.m_size * 0.2 + Utils.random() * this.m_size * 0.05);


  }


  treeOnParcel(parcel : Parcel) {
    let parent = this.parcelToBoundingBox(parcel)[0]
    //let s = new ShapeNode()
    this.makeRandomTree(parent)
    let xz = 0.2 * this.m_size
    let smin = Math.min(parent.scale[0], parent.scale[2])
    parent.scale[0] = xz
    parent.scale[1] = xz
    parent.scale[2] = xz

    this.root.addChild(parent)

  }

  lampOnParcel(parcel : Parcel) {
    let parent = this.parcelToBoundingBox(parcel)[0]
    //let s = new ShapeNode()
    parent.position[1] += 0.01
    parent.scale[0] = this.m_size * 10
    parent.scale[2] = this.m_size * 10
    parent.meshname = 'streetlamp'
    //parent.rotation[1] += 180
    let xz = 2.0 * this.m_size
    parent.scale[0] = xz
    parent.scale[2] = xz
    ShapeNodeFunctions.setScaleAboutMinEnd(parent,1, xz)
    parent.tex_cell = TexCell.GRAVEL1
    this.root.addChild(parent)

  }

  randomMaster() {
    Utils.count++

    let master =  {
      'window': Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW10 + 1),
      'facade1': Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE10 + 1),
      'facade2': Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE10 + 1),
      'lowlod': Utils.randomIntRange(TexCell.LOWLOD1, TexCell.LOWLOD10 + 1),
      'door': Utils.randomIntRange(TexCell.DOOR1, TexCell.DOOR5 + 1),
      'roof': Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF10 + 1),
      'lod': -1
    }

    //some roofs are the same as their regular facades
    if(Utils.random() < 0.6) {
      master['roof'] = master['facade1']
    }
    return master
  }

  randomBuildingSeed(s : ShapeNode) {
    let ys = 0.3 + 0.35 * (Utils.perlin(vec2.fromValues(s.position[0] * 1.6, s.position[2] * 1.6)) + 1);
    let randomMat = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5)
    let geom = new ShapeNode()
    geom.tex_cell = randomMat
    geom.symbol = 'start'
    s.meshname = ''
    s.master = this.randomMaster()

    s.position[1] += 0.01
    s.addChild(geom)
    ShapeNodeFunctions.setScaleAboutMinEnd(s, 1, ys * ys);

  }

  buildingOnParcel(parcel : Parcel, lod = -1) {
    //let res = this.parcelToBoundingBox(parcel)

    let res = ShapeNodeFunctions.extrudeFace(parcel.face)
   // let res = ShapeNodeFunctions.extrudeAndScaleFace(parcel.face, 0.6, vec3.fromValues(0.1,0,0.8))

    let parent = new ShapeNode()
    parent.symbol = ''
    parent.meshname = ''
    parent.master = this.randomMaster()
    if(parcel.flag) {
      console.log("found a flag")
      parent.master['facade1'] = TexCell.GREEN

    }
    parent.parcel = parcel
    parent.master['lod'] = lod
    let yVar = this.max_building_height - this.min_building_height

    for (let r = 0; r < res.length; r++) {
      //res[r].master = this.randomMaster()
      res[r].parcel = parcel
      res[r].symbol = 'start'
      res[r].setTextureForAllChildren(parent.master['lowlod'])
      let perlin = 0.5 + 0.5 * Utils.perlin(vec2.fromValues(res[r].position[0] * this.height_noise, res[r].position[2] * this.height_noise))
      let ys = this.min_building_height + yVar * perlin;
      ShapeNodeFunctions.setScaleAboutMinEnd(res[r], 1, ys);

      //this.randomBuildingSeed(res[r])        
      //this.shapes.push(res[r].children[0])
      parent.addChild(res[r])
      this.shapes.push(res[r])

    }
    parent.position[1] += 0.02
    this.root.addChild(parent)
    return parent
  }


  buildingOnFace(face : Array<GraphVertex>) {
    //let res = ShapeNodeFunctions.boxesAlongEdges(face, 0.55, 1.8 * this.m_size, 3 * this.m_size, this.m_size, this.m_size, 0.01)
    let res = this.faceToBoundingBox(face)
    //console.log("CENTER " + pos)
      for (let r = 0; r < res.length; r++) {
        this.randomBuildingSeed(res[r])        
        this.shapes.push(res[r].children[0])
        this.root.addChild(res[r])

      }
  }

  lampsOnFace(face : Array<GraphVertex>) {
    let lamps = ShapeNodeFunctions.boxesAlongEdges(face, 0.8, 0.1, 0, 0.01, 0, 0.02, 0.2)


    for (let r = 0; r < lamps.length; r++) {
      //res1[r].scale = vec3.fromValues(0.05,0.05,0.05)
      lamps[r].position[1] += 0.01
      lamps[r].scale[0] = this.m_size * 2
      lamps[r].scale[2] = this.m_size * 2
      lamps[r].meshname = 'streetlamp'
      lamps[r].rotation[1] += 180

      lamps[r].tex_cell = TexCell.GRAVEL1
      ShapeNodeFunctions.setScaleAboutMinEnd(lamps[r], 1, this.m_size * 2);

      this.root.addChild(lamps[r])

    }
  }

  parkOnFace(face : Array<GraphVertex>) {
    let treedist = Utils.random() * 0.2 + 0.1

    let res = ShapeNodeFunctions.boxesAlongEdges(face, 0.55, treedist, 0.7, 0.01, 0, 0.03)
    for (let r = 0; r < res.length; r++) {
      this.makeRandomTree(res[r])
      res[r].scale[0] = this.m_size * 0.2
      res[r].scale[2] = this.m_size * 0.2
  
      this.root.addChild(res[r])

    }
  }


  fillSimpleAxiom() {
    Utils.count = 0
    let face = new Array<GraphVertex>()
    face.push(new GraphVertex(vec3.fromValues(0.5,0,0.5)))
    face.push(new GraphVertex(vec3.fromValues(0.5,0,-0.5)))

    face.push(new GraphVertex(vec3.fromValues(-0.5,0,-0.5)))
    //face.push(new GraphVertex(vec3.fromValues(0.0,0,0.2)))

    face.push(new GraphVertex(vec3.fromValues(-0.5,0,0.5)))

    //let res = ShapeNodeFunctions.extrudeAndScaleFace(face,1.0,vec3.fromValues(0.5,0,0.5))
    //let res = ShapeNodeFunctions.extrudeAndScaleFace(face,1.0,vec3.fromValues(1,0,1))

    //this.root.addChild(res[0])
     let lotParcel = new Parcel(face)
     lotParcel.getOBB()
     console.log("face " + lotParcel.face)

     //lotParcel.splitInset(0.1)
     console.log("face " + lotParcel.face)
     lotParcel.graph.findFaces()
     console.log("num faces " + lotParcel.graph.faces.length)
     let block = new Block()
     block.parcels.push(lotParcel)
     //block.subdivideParcels(0.06,0.3, 0.4, true)
    //  for(let i = 0; i < lotParcel.graph.faces.length;i++) {
    //    let face2 = lotParcel.graph.faces[i]
    //    let parcel = new Parcel(face2)
    //    parcel.hasStreetAccess(face)
    //    if(parcel.street_access) {
    //     let res = ShapeNodeFunctions.extrudeFace(face2)[0]
    //     this.root.addChild(res)
    //    }

    //  }


     let parent = this.buildingOnParcel(lotParcel)
     let r = parent.children[0]
     ShapeNodeFunctions.setScaleAboutMinEnd(r, 1, 0.5)
     let roadParcel = new Parcel(face)

    // //roadParcel.splitOBBSym(0.2)

    this.m_roads = new Roads()
    this.m_roads.road_graph = lotParcel.graph
    this.drawRoads()


  }

  
  groundPlane() {
    let g = new ShapeNode();
    g.meshname = 'cube'
    //celsize
    let cs = this.cell_size;
    g.scale = vec3.fromValues(this.gridDivs * cs * 1.2, 0.1, this.gridDivs * cs * 1.2);
    g.terminal = true;
    g.tex_cell = TexCell.ROOF2;

    g.position = vec3.fromValues(0, -0.05, 0);
    g.position[2] += g.scale[2] * 0.5;
    return g
  }


  divideBlock(parcel : Parcel) {

    let block = new Block()
    block.parcels.push(parcel)
    block.subdivideParcels();
    return block
  }

  treesOnFace(face:Array<GraphVertex>) {
    let treedist = Utils.random() * 0.2 + 0.1

    let res1 = ShapeNodeFunctions.boxesAlongEdges(face, 0.75, treedist, 0.7, 0.01, 0, 0.03)
    res1 = res1.concat(ShapeNodeFunctions.boxesAlongEdges(face, 0.2, treedist, 0.7, 0.01, 0, 0.03))


    for (let r = 0; r < res1.length; r++) {
      //res1[r].scale = vec3.fromValues(0.05,0.05,0.05)
      this.makeRandomTree(res1[r])
      let xz = 0.2 * this.m_size
      //let smin = Math.min(res1[r].scale[0], res1[r].scale[2])
      res1[r].scale[0] = xz
      res1[r].scale[1] = xz
      res1[r].scale[2] = xz
  
      this.root.addChild(res1[r])

      if(r > 5) {
        //break
      }
    }
  }

  

  lotFromFace(face:Array<GraphVertex>) {
    let lot = ShapeNodeFunctions.extrudeFace(face)[0]
    lot.scale[0] = 1.0
    lot.scale[2] = 1.0
   lot.position[1] += 0.006
   lot.symbol = "buildings"
   // lot.tex_cell = Utils.randomIntRange(TexCell.FACADE1, TexCell.DOOR2)
  // console.log("lot tex " + lot.tex_cell)
  let tex = TexCell.GRAVEL1
  if(face.length > 10 && Utils.random() > 0.8) {
    lot.symbol = "park"

   tex = TexCell.GREEN
  } 
   ShapeNodeFunctions.setScaleAboutMinEnd(lot, 1, 0.01)
   for (let c = 0; c < lot.children.length; c++) {
     for(let cc =0 ; cc < lot.children[c].children.length; cc++) {
       lot.children[c].children[cc].tex_cell = tex

     }
     lot.children[c].tex_cell = tex

   }
   this.root.addChild(lot)
   return lot
  }

  makeRoads() {
    this.m_roads = new Roads()
    this.m_roads.center_size = this.center_size
    this.m_roads.minor_freq = this.minor_freq
    this.m_roads.major_freq = this.major_freq
    this.m_roads.perlin_scale = this.perlin_scale
    this.m_roads.resetBoundsSquare(this.gridDivs)
    //this.m_roads.expandAxiom();
    this.m_roads.expandSegments();
    // this.m_roads.findFaces()
    this.m_roads.fillMesh();
    this.drawRoads();
  }

  fillAxiom() {
    Utils.count =0
    ShapeNodeFunctions.windowFactor = this.window_freq
    this.makeRoads()
    let blocks = 0
    for (let i = 0; i < this.m_roads.road_graph.faces.length; i++) {
      //blocks++
      let lod = 3


      //create parcel for extruded lot face
      let blockface = this.m_roads.road_graph.faces[i]
      let rounded = blockface//this.roundCorners(face)
      let lotParcel = new Parcel(blockface)
      lotParcel.squareAcuteAngles(40, 0.1)
      //let lot = this.lotFromFace(lotParcel.face)      

      lotParcel.insetParcelUniformXZ(0.08)
      //lotParcel.splitInset()
     //lotParcel.scaleParcelUniformXZ(vec3.fromValues(0.95,1,0.95))
     let camXZ = Utils.xz(this.cam_pos)
     let lotDist = vec2.distance(lotParcel.obb.pos,camXZ)

     let full_block = blocks < this.blocks && lotDist < 3
     if(full_block) {
      lod = -1
      blocks++
      }
      let lotBlock = new Block()
      lotBlock.parcels.push(lotParcel)
      lotBlock.subdivideParcels()

      for(let k =0; k < lotBlock.parcels.length; k++ ) {
        this.lotFromFace(lotBlock.parcels[k].face)
      }

      if(!this.buildings_only && full_block) {
        this.lampsOnFace(blockface)
        //this.treesOnFace(blockface)
      //let blocks = 5;
      }

      let lotface = lotParcel.face
      let building_parcel = new Parcel(lotface)
      // parcel.scaleParcelUniformXZ(vec3.fromValues(0.7,1,0.7))
      building_parcel.squareAcuteAngles(45, 0.1)
      let streets = building_parcel.face
      building_parcel.splitInset(0.1)
      building_parcel.graph.findFaces()
     //parcel.squareAcuteAngles(45, 0.1)
   
     let inner_parcels = new Array<Parcel>()
     let outer_parcels = new Array<Parcel>()

     for(let i = 0; i < building_parcel.graph.faces.length;i++) {
      let face2 = building_parcel.graph.faces[i]
      let parcel = new Parcel(face2)
      parcel.hasStreetAccess(streets)
      if(parcel.street_access) {
        outer_parcels.push(parcel)
       //let res = ShapeNodeFunctions.extrudeFace(face2)[0]
      // this.root.addChild(res)
      } else {
        inner_parcels.push(parcel)
      }

    }

    for(let n = 0; n < inner_parcels.length; n++) {

      let parcel = inner_parcels[n]
      let area = parcel.obb.getArea()
      let block = this.divideBlock(parcel)

      for (let j = 0; j<block.parcels.length; j++) {
        let face = block.parcels[j].face

        if(!block.parcels[j].street_access) {
          if(!this.buildings_only && full_block) {
            this.treeOnParcel(block.parcels[j])
          }
          continue;
        }

        if(area > 0.05) {
          this.buildingOnParcel(block.parcels[j], lod)
        }


        if(face.length > 3) {
          //this.buildingOnParcel(block.parcels[j], lod)
  
        } else {
          if(!this.buildings_only && full_block) {
            this.treeOnParcel(block.parcels[j])
          }
  
        }
      }
    }

    if(full_block && !this.buildings_only) {
      for(let o = 0; o < outer_parcels.length; o++) {
        let parcel = outer_parcels[o]
        let block = new Block()
        block.parcels.push(parcel)
        block.subdivideParcels(0.04)
        for (let j = 0; j<block.parcels.length; j++) {
          if(block.parcels[j].has_street_vert) {
            this.treeOnParcel(block.parcels[j])
          } else {
            this.treeOnParcel(block.parcels[j])
          }

        }
  
      }

      
    }

      //break

    }
    
  }

  fillMeshNames() {
    this.meshNames = new Map<string, Mesh>();
    OBJ.downloadMeshes({
      'cube': './geo/cube.obj',
      'window1': './geo/windowplane.obj',
      'plane': './geo/plane.obj',
      'roof1': './geo/bevelroof.obj',
      'roof2': './geo/slantroof.obj',
      'roof3': './geo/outroof.obj',
      'watertower': './geo/watertower.obj',
      'window2': './geo/bigwindow.obj',
      'window3': './geo/windowplanesimple.obj',
      'spire': './geo/spire.obj',
      'spike': './geo/tallspike.obj',
      'door1': './geo/door1.obj',
      'door2': './geo/door2.obj',
      'door3': './geo/door3.obj',
      'door4': './geo/door4.obj',
      'door5': './geo/door5.obj',
      'extrudeplane': './geo/extrudeplane.obj',
      'streetlamp': './geo/streetlamp.obj',
      'doorplane': './geo/doorplane.obj',
      'tree1': './geo/ntree1.obj',
      'tree2': './geo/tree2.obj',
      'tree3': './geo/ntree1.obj',
      'tree4': './geo/tree4.obj',

      'shrub1': './geo/shrub1.obj',
      'shrub2': './geo/shrub1.obj'

    }, (meshes: any) => {

      for (let item in meshes) {
        //console.log("Item" + item.toString());
        let mesh = new Mesh('/geo/cube.obj');
        mesh.loadMesh(meshes[item]);
        this.meshNames.set(item.toString(), mesh);

      }

      let mesh = new Plane('/geo/plane.obj');
      mesh.loadMesh();
      this.meshNames.set('plane', mesh);


      this.expandGrammar();
      this.loadMeshes();
      this.createAll();
      this.finishedLoading = true;
    });
  }

  //functions for bounding volume subdivision in XZ plane
  fillStartList() {
    //initial shape of building
    this.symbolsToRules.set("start", new Array<FreqPair>());
    // this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.halve));
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stackY)); 
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stretchRand));
    //this.symbolsToRules.get("start").push(new FreqPair(0.2, ShapeNodeFunctions.passThrough));
    //this.symbolsToRules.get("start").push(new FreqPair(0.5, ShapeNodeFunctions.growYOffsetX));
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.OffsetYSim));
    this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.offsetYParcel));
    this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.offsetYSimParcel));


  }

  //functions for bounding volume subdivision in Y direction
  fillStackList() {
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stackY));
    this.symbolsToRules.set("stack", new Array<FreqPair>());
    this.symbolsToRules.get("stack").push(new FreqPair(0.3, ShapeNodeFunctions.stackPassThrough));
    //this.symbolsToRules.get("stack").push(new FreqPair(0.3, ShapeNodeFunctions.offsetYParcel));
    this.symbolsToRules.get("stack").push(new FreqPair(0.5, ShapeNodeFunctions.stackSplitOBB));
    this.symbolsToRules.get("stack").push(new FreqPair(0.1, ShapeNodeFunctions.stackScaleExponential));
   // this.symbolsToRules.get("stack").push(new FreqPair(0.05, ShapeNodeFunctions.stackAndRotate));
    //this.symbolsToRules.get("stack").push(new FreqPair(0.05, ShapeNodeFunctions.stackandOffset));

    //this.symbolsToRules.get("stack").push(new FreqPair(0.3, ShapeNodeFunctions.stackYParcel));


  }

  fillStructureList() {
    //structure -> levels structure, roof and ceiling
    this.symbolsToRules.set("structure", new Array<FreqPair>());
    //this.symbolsToRules.get("structure").push(new FreqPair(0.9, ShapeNodeFunctions.entranceLevelsRoof));
    this.symbolsToRules.get("structure").push(new FreqPair(0.9, ShapeNodeFunctions.entranceLevelsRoofPoly));

  //  this.symbolsToRules.get("structure").push(new FreqPair(0.1, ShapeNodeFunctions.entranceLevelsRoofHexagon));
  }


  fillRoofList() {
    //roofs
    this.symbolsToRules.set("roof", new Array<FreqPair>());
    this.symbolsToRules.get("roof").push(new FreqPair(0.7, ShapeNodeFunctions.extrudeOuterRoofParcel));
    this.symbolsToRules.get("roof").push(new FreqPair(0.01, ShapeNodeFunctions.spireRoofParcel));
    this.symbolsToRules.get("roof").push(new FreqPair(0.3, ShapeNodeFunctions.flatRoofParcel));


  }


  fillRoofDecorationList() {
    //roofs
    this.symbolsToRules.set("roof decor", new Array<FreqPair>());
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.decorateRoofParcel));
    // this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof1));
    //this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof2));

  }


  fillFacadeSubdivList() {
    //planar facades -> further facade subdivisions
    this.symbolsToRules.set("level", new Array<FreqPair>());
    this.symbolsToRules.get("level").push(new FreqPair(0.6, ShapeNodeFunctions.divFacadePlaneSym));
    //this.symbolsToRules.get("level").push(new FreqPair(0.3, ShapeNodeFunctions.glassFacadePlane));


  }

  fillPlaneSubdivList() {
    //facade subdivisions -> small subdivisions for windows, etc
    this.symbolsToRules.set("subdivA", new Array<FreqPair>());
    this.symbolsToRules.get("subdivA").push(new FreqPair(0.7, ShapeNodeFunctions.divPlaneUniform));
    //this.symbolsToRules.get("subdivA").push(new FreqPair(0.3, ShapeNodeFunctions.divPlaneNonUniform));
  }

  fillWindowList() {
    //facade -> windows
    this.symbolsToRules.set("facade", new Array<FreqPair>());
    //this.symbolsToRules.get("subdiv").push(new FreqPair(0.3, ShapeNodeFunctions.uniformWindow1));
    this.symbolsToRules.get("facade").push(new FreqPair(0.3, ShapeNodeFunctions.scatterWindow1));


  }


  fillEntranceList() {
    //subdivisions -> windows
    this.symbolsToRules.set("entrance", new Array<FreqPair>());
    this.symbolsToRules.get("entrance").push(new FreqPair(0.3, ShapeNodeFunctions.divBottomFloor));

  }

  fillDoorList() {
    //subdivisions -> windows
    this.symbolsToRules.set("door", new Array<FreqPair>());
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.addDoor));
    //this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door5));

  }


  applyDeterminedRule(s: ShapeNode) {
    let res: Array<ShapeNode> = new Array<ShapeNode>();

    if (!this.symbolsToRules.has(s.symbol)) {
      // console.log("no symbol found: " + s.symbol);
      res.push(s);
      return res;
    }

    let pairs = this.symbolsToRules.get(s.symbol);
    let rand = 0.5;
    let curr = 0;

    for (let i = 0; i < pairs.length; i++) {
      curr += pairs[i].freq;
      if (rand < curr || i == pairs.length - 1) {
        res = pairs[i].rule(s);
        return res;
      }
    }
    //res.push(s)
    return res;

  }


  applyRandomRule(s: ShapeNode) {
    let res: Array<ShapeNode> = new Array<ShapeNode>();

    if (!this.symbolsToRules.has(s.symbol)) {
      // console.log("no symbol found: " + s.symbol);
      res.push(s);
      return res;
    }

    let pairs = this.symbolsToRules.get(s.symbol);
    let rand = Utils.random();
    let curr = 0;

    for (let i = 0; i < pairs.length; i++) {
      curr += pairs[i].freq;
      if (rand < curr || i == pairs.length - 1) {
        res = pairs[i].rule(s);
        return res;
      }
    }
    //res.push(s)
    return res;
  }


  expandGrammar() {

    let expanded = this.shapes;

    for (let k = 0; k < this.iterations; k++) {
      let previous = expanded;
      expanded = new Array<ShapeNode>();

      for (let i = 0; i < previous.length; i++) {
        //we want to prevent adding the same shapenode twice to the expansion
        let added = new Set<ShapeNode>();

        previous[i].depth = k;

        let master = previous[i].getMaster()
        if (previous[i].depth > master['lod'] && master['lod'] > -1) {
          previous[i].terminal = true;
        }

        if (!previous[i].terminal) {
          let successors = this.applyRandomRule(previous[i]);

          for (let s = 0; s < successors.length; s++) {
            if (!added.has(successors[s])) {
              expanded.push(successors[s]);
              added.add(successors[s]);
            }
          }
        } else {
          if (!added.has(previous[i])) {
            expanded.push(previous[i]);
            added.add(previous[i]);
          }
        }


      }

      //for(let i = 0; i < expanded.length; i++) {
      // expanded[i].depth = k;
      //}
    }

    this.shapes = expanded;
  }

  loadMeshesRecursively(shapeNodes: Array<ShapeNode>, parentTrans: mat4) {
    for (let i = 0; i < shapeNodes.length; i++) {

      let m = new Mesh(shapeNodes[i].meshname, shapeNodes[i].position, shapeNodes[i].scale, shapeNodes[i].rotation);

      mat4.multiply(m.transform, parentTrans, m.transform);

      if (this.randomColor) {
        let r = Utils.random() * 0.3;
        let g = Utils.random() * 0.7 + 0.3;
        let b = Utils.random() * 0.4 + 0.6;

        m.m_color[0] = r;
        m.m_color[1] = g;
        m.m_color[2] = b;
        m.uv_cell = Utils.randomIntRange(TexCell.WINDOW1, TexCell.DOOR1);
        //if(shapeNodes[i].global_tex) {
          //m.tex_divs = 1
        //}
        //m.scale_uvs = !shapeNodes[i].global_tex

      } else {
        // m.m_color = vec4.fromValues(0.2 * shapeNodes[i].depth,0.8,0.8, 1.0);

        m.m_color = vec4.fromValues(0.5, 0.8, 0.8, 1.0);
        m.uv_cell = shapeNodes[i].tex_cell;
        m.scale_uvs = !shapeNodes[i].global_tex
        m.flip_uvy = shapeNodes[i].flip_uvy


      }


      if (this.meshNames.has(shapeNodes[i].meshname)) {
        this.fullMesh.transformAndAppend(this.meshNames.get(shapeNodes[i].meshname), m);
      } else if (shapeNodes[i].polyplane !== undefined) {
        shapeNodes[i].polyplane.loadMesh();

        this.fullMesh.transformAndAppend(shapeNodes[i].polyplane, m);


      } else {
        //console.log("cannot find meshname: " + shapeNodes[i].meshname)
        m.enabled = false;
      }

      this.loadMeshesRecursively(shapeNodes[i].children, m.transform);
    }

  }

  loadMeshes() {
    this.loadMeshesRecursively(this.root.children, mat4.create());
    //this.meshes = new Array<Mesh>();

  }

  createAll() {
    this.fullMesh.computeTBN();
    this.fullMesh.create();
    for (let mesh of this.meshes) {
      //mesh.create();
    }
  }

};

export default ShapeGrammar;
