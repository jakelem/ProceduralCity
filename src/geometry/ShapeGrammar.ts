import { vec2, vec3, vec4, mat4, mat3 } from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import { gl } from '../globals';
import Mesh from './Mesh';
import PolyPlane from './PolyPlane';

import Utils from './Utils';
import Plane from './Plane';
import { Roads, GraphVertex, BoundingBox2D } from './Roads'
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
  LEAVES1

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
  static windowFactor = 16

  static randomDoor() {
    let r = Math.random()

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
    let r = Math.random()

    if (r < 0.1) {
      return 'roof1'
    } else if (r < 0.4) {
      return 'roof2'
    } else {
      return 'roof1'
    }

  }

  static randomRoofDecor(s: ShapeNode) {
    let r = Math.random()

    s.symbol = ''
    if (r < 0.08) {
      let randx = Math.random() * 0.8 + 0.2;
      let randz = Math.random() * 0.8 + 0.2;

      s.meshname = 'roof1'
      let ys = 1.2 * Math.random()
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz

      return

    } else if (r < 0.12) {
      let randx = Math.random() * 0.8 + 0.2;
      let randz = Math.random() * 0.8 + 0.2;

      s.meshname = 'cube'
      let ys = 1.2 * Math.random() + 1.0
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz
      s.symbol = 'start'

      return

    } else if (r < 0.15) {
      let randx = Math.random() * 0.8 + 0.2;
      let randz = Math.random() * 0.8 + 0.2;

      s.meshname = 'roof2'
      let ys = 1.2 * Math.random()
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
      let randx = Math.random() * 0.5 + 0.5;
      let randz = Math.random() * 0.5 + 0.5;

      s.meshname = 'cube'
      let ys = 1.2 * Math.random()
      ShapeNodeFunctions.addScaleAboutMinEnd(s, 1, ys)
      s.scale[0] *= randx
      s.scale[2] *= randz
      s.symbol = 'start'

      return

    } else {
      s.meshname = 'shrub1'
      s.position[1] = 0

      s.scale[0] *= 0.2 + Math.random() * 0.2
      s.scale[1] *= 0.2 + Math.random() * 0.2
      s.scale[2] *= 0.2 + Math.random() * 0.2
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

      let sz = j < intervals.length - 2 ? Math.random() * widthVar : widthVar


      sn.scale[2] += sz
      sn.symbol = 'start'
      vec3.lerp(sn.position, lastp, nextp, 0.5)
      sn.position[1] = 0.5


      vec3.scaleAndAdd(sn.position, sn.position, look, -0.5 * sz)
      res.push(sn)
    }
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
      let lastL = lengthMin + Math.random() * lengthVar

      let num = 0
      while (currL + overlap < length  && currL + lengthMin < length) {
        intervals.push(currL)
        // widthIntervals.push(Math.random() * (overlap - 0.1))

        if (Math.random() > 0.5) {
          lastL = lengthMin + Math.random() * lengthVar

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


  static extrudeFace(face: Array<GraphVertex>, excludeTop = false) {
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
      let floorshape = ShapeNodeFunctions.splitAlongLocalPt(xyPlane, 0.9, 2)[1];
      xyPos.addChild(floorshape);

      xyPos.position[1] = 0;
    }

    if (!excludeTop) {
      let top = new ShapeNode()
      top.polyplane = new PolyPlane()
      top.symbol = ''
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

  static splitAlong(s: ShapeNode, frac: number, ind: number): Array<ShapeNode> {
    let res = new Array<ShapeNode>();
    let xSize = s.scale[ind];
    let xMin = s.position[ind] - xSize * 0.5;
    let left = xMin + frac * xSize * 0.5;
    let right = xMin + frac * xSize + (1 - frac) * xSize * 0.5;
    let dup = new ShapeNode();
    dup.copyshallow(s);
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
    //let x = Math.random() * 0.7;
    let y = Math.random() * 2;
    //let z = Math.random() * 0.7;

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

    let axis = Math.random() < 0.5 ? 0 : 2;
    let bAxis = axis == 0 ? 2 : 0;


    if (s.scale[axis] > 0.5) {

      let randoff = 0.2 + 0.05 * Math.random();

      let res = ShapeNodeFunctions.splitAlong(s, randoff, axis);
      let dup = res[1];
      let randy = 0.1 * Math.random() - 0.2;
      let randb = Math.random();
      randy = -randy
      ShapeNodeFunctions.addScaleAboutMinEnd(dup, 1, randy)
      /// s.tex_cell =randMat
      ///  dup.tex_cell =randMat
      s.parent.addChild(dup)
      newChildren.push(dup);
    }
    // }

    for (let i = 0; i < newChildren.length; i++) {
      //parent.addChild(newChildren[i])
    }
    //console.log("dupcliate and offset " + res);
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
    //for(let i = 0 ; i < parent.children.length; i++) {
    let axis = Math.random() < 0.5 ? 0 : 2;
    let sign = Math.random() < 0.5 ? -1 : 1;

    if (s.scale[axis] > 0.5) {
      let randoff = 0.1 + 0.3 * Math.random();
      randoff = ShapeNodeFunctions.fracFromWorldSize(s, 0.9 + 0.1 * Math.random(), axis);
      randoff = Utils.clamp(randoff, 0.15, 0.2);
      let res = ShapeNodeFunctions.splitAlongSym(s, randoff, axis);
      let randy = (Math.random() * 0.2 + 0.1);
      randy = Utils.clamp(randy, s.scale[1] * 0.1, s.scale[1] * 0.3);
      randy = -randy;
      ShapeNodeFunctions.addScaleAboutMinEnd(res[0], 1, randy)
      ShapeNodeFunctions.addScaleAboutMinEnd(res[1], 1, 0)
      ShapeNodeFunctions.addScaleAboutMinEnd(res[2], 1, randy)

      newChildren.push(res[0])
      newChildren.push(res[2])

      s.parent.addChild(res[0])
      s.parent.addChild(res[2])

      //res[0].tex_cell = randomMat
      //res[1].tex_cell = randomMat
      // res[2].tex_cell = randomMat

    }
    //}

    // for(let i = 0; i < newChildren.length; i++) {
    //   s.parent.addChild(newChildren[i])
    // }

    return newChildren;

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

  static decorateRoof(s: ShapeNode): Array<ShapeNode> {
    let master = s.getMaster()
   // console.log("decorateRoof");
    s.symbol = "";
    let roofmat = master['facade2']
    s.tex_cell = Math.random() > 0.5? master['facade1'] : master['roof']
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

        if (Math.random() > 0.5) {


          let dup = new ShapeNode();
          let minS = Math.min(dx, dz)

          let randY = (Math.random() + 1.0)

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


          dup.position[0] = xpos - 0.5 //+ (Math.random()-0.5) * dx * 0.5
          dup.position[1] = dup.scale[1] * 0.5
          dup.position[2] = zpos - 0.5 //+ (Math.random()-0.5) * dz * 0.5

          dup.position[0] *= ss
          dup.position[2] *= ss

          dup.tex_cell = roofmat
          ShapeNodeFunctions.randomRoofDecor(dup)
          //dup.symbol = 'start'
          //dup.symbol = "roof decor";
          s.addChild(dup)
          res.push(dup)
        }
        //res.push(dup);

      }
    }

    //dup.copyshallow(s);
    //let randS = Math.random() * 0.2 + 0.5;
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

  static stackY(s: ShapeNode): Array<ShapeNode> {
    //console.log("growYOffsetX");
    //console.log("S DEPTH" + s.depth);

    if (s.depth >= 1) {
      s.symbol = "structure"
    }
    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);
    let randS = Math.random() * 0.4 + 0.5;
    let randY = Math.random() * 0.1 + 0.1;

    dup.scale[0] *= randS
    dup.scale[1] = randY

    dup.scale[2] *= randS

    vec3.scale(dup.scale, dup.scale, randS);
    //let randoff = 0;
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));
    //dup.position[0] -= 0.1

    dup.position[1] = s.position[1] + s.scale[1] * 0.5 + dup.scale[1] * 0.5;
    // s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

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

        if (level !== undefined) {
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

    if (level !== undefined) {
      s.parent.addChild(level)

    }
    s.parent.addChild(roof)

    return s.parent.children;
  }

  static divBottomFloor(s: ShapeNode): Array<ShapeNode> {
    //console.log("divbottomfloor");
    s.symbol = "door";
    return ShapeNodeFunctions.divUniformRandomSize(s, 0.1, 0.05, s.scale[1] + 10, 0.0);
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

  //input is shapenode containing planar subdivisions
  static dividePlaneNonUniform(plane: ShapeNode, divs: number, axis: number) {
    //console.log("DIVIDE PLANE NONUNIFORM");  
    let res = new Array<ShapeNode>();
    let d = plane.scale[axis] / divs;
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

  static divAxis(s: ShapeNode): Array<ShapeNode> {
    let g_scale = s.approxGlobalScale()
    for (let i = 0; i < s.children.length; i++) {
      let newChildren = new Array<ShapeNode>();
      //let dups = ShapeNodeFunctions.dividePlaneNonUniform(s.children[i].children[j],3, 0);
      //newChildren = newChildren.concat(dups);
      if (s.children[i].position[0] == 0) {
        // xy plane
        let div = Math.ceil(g_scale[0] * s.children[i].scale[0] * ShapeNodeFunctions.windowFactor);
        let yDiv = Math.ceil(g_scale[1] * s.children[i].scale[2] * ShapeNodeFunctions.windowFactor);

        ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], div, 0);
        ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], yDiv, 2);

      } else {
        // yz plane
        let div = Math.ceil(g_scale[2] * s.children[i].scale[0] * ShapeNodeFunctions.windowFactor);
        let yDiv = Math.ceil(g_scale[1] * s.children[i].scale[2] * ShapeNodeFunctions.windowFactor);

        ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], div, 0);
        ShapeNodeFunctions.dividePlaneNonUniform(s.children[i], yDiv, 2);

      }
    }

    return new Array<ShapeNode>(s);
  }


  //xmin, xvar: minimum size of an x subdivision, range on this min size
  //ymin, yvar: minimum size of a y subdivision, range on this min size

  static divUniformRandomSize(s: ShapeNode, xMin: number, xVar: number, yMin: number, yVar: number): Array<ShapeNode> {
    let g_scale = s.approxGlobalScale()
    for (let i = 0; i < s.children.length; i++) {
      let windowX = xMin + xVar * Math.random();
      let windowY = yMin + yVar * Math.random();
      //check which face of the cube this is on (x or z)
      if (s.children[i].position[0] == 0) {
        // xy plane
        let xDiv = Math.ceil(g_scale[0] / windowX);
        let yDiv = Math.ceil(g_scale[1] / windowY);
        ShapeNodeFunctions.dividePlaneUniform(s.children[i], xDiv, 0);
        ShapeNodeFunctions.dividePlaneUniform(s.children[i], yDiv, 2);
      } else {
        // yz plane
        let xDiv = Math.ceil(g_scale[2] / windowX);
        let yDiv = Math.ceil(g_scale[1] / windowY);
        ShapeNodeFunctions.dividePlaneUniform(s.children[i], xDiv, 0);
        ShapeNodeFunctions.dividePlaneUniform(s.children[i], yDiv, 2);
      }
    }
    return new Array<ShapeNode>(s);
  }


  static divHalvePlane(s: ShapeNode): Array<ShapeNode> {
    //console.log("divHalvePlane");
    s.symbol = 'subdivB';

    return ShapeNodeFunctions.divUniformRandomSize(s, 1 / ShapeNodeFunctions.windowFactor, 0.05, 1 / ShapeNodeFunctions.windowFactor, 0.05);
  }


  static divAxisTest(s: ShapeNode): Array<ShapeNode> {
    //console.log("divHalvePlane");
    s.symbol = 'subdivB';

    return ShapeNodeFunctions.divAxis(s);
  }


  static glassFacadePlane(s: ShapeNode): Array<ShapeNode> {
    let master = s.getMaster()
    s.symbol = 'subdivA';
    s.meshname = 'plane';
    //s.terminal = true;
    let sameFacade = Math.random() < 0.7
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

        if (glb_scale[1] < 0.4 || Math.random() < 0.6) {
          randdiv = 1
        }

        let div = ShapeNodeFunctions.dividePlane(shp, 1, randdiv);

        div.push(shp)
        let pillarsize = Math.random() > 0.5 ? 0 : Math.random() * 0.1
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
    let sameFacade = Math.random() < 0.7
    let randF = master['facade1']//Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5 + 1);
    let randF2 = master['facade2']

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
        shp.symbol = '';
        shp.meshname = '';

        shp.tex_cell = TexCell.ROOF1;
        s.children[i].meshname = ''
        s.children[i].tex_cell = randF;
        //shp.position[1] = 0.0;
        //newChildren.push(shp); 
        let randdiv = Utils.randomIntRange(1, 5);

        if (glb_scale[1] < 0.4 || Math.random() < 0.6) {
          randdiv = 1
        }

        let div = ShapeNodeFunctions.dividePlane(shp, 1, randdiv);


        div.push(shp)
        for (let d = 0; d < div.length; d++) {
          let splitSize = Utils.randomFloatRange(0.05, 0.1);
          //newChildren.push(div[d]);
          //div[d].tex_cell = randF;
          let r = ShapeNodeFunctions.splitAlong(div[d], 1 - splitSize, 2);
          r[1].tex_cell = randF2;
          r[1].symbol = 'pillar';
          r[1].meshname = 'extrudeplane';
          r[1].position[1] = 0.001

          let r1_gscale = r[1].approxGlobalScale()
          r[0].symbol = 'window cell';
          r[0].tex_cell = randF;

          let pillarsize = Math.random() * 0.2
          let rx = ShapeNodeFunctions.splitAlongSym(r[0], pillarsize, 0);
          rx[0].symbol = 'pillar'
          rx[0].position[1] = 0.001
          rx[0].tex_cell = Math.random() > 0.5? randF : randF2
          rx[0].meshname = 'plane'

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
    let randoff = (Math.random() - 0.5) * dup.scale[2];
    vec3.add(dup.scale, dup.scale, vec3.fromValues(-0.1, 1.0, -0.1));
    vec3.add(dup.position, dup.position, vec3.fromValues(0.0, 0.0, 0.0));
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static setFacadeMaterial(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.uniformFacade(s, '', 0);
  }

  static uniformFacade(s: ShapeNode, windowName: string, windowTex: TexCell = 0): Array<ShapeNode> {
    //console.log("uniformFacade");
    s.symbol = 'facade';

    for (let i = 0; i < s.children.length; i++) {
      let randWind = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);
      let randWind2 = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);

      for (let j = 0; j < s.children[i].children.length; j++) {
        //s.children[i].children[j].meshname = 'plane';//windowName;
        if (s.children[i].children[j].symbol == "window cell") {
          //s.children[i].children[j].tex_cell = randWind;

        } else {
          //s.children[i].children[j].tex_cell = randWind2;

        }
      }
    }
    return new Array<ShapeNode>(s);
  }

  static scatterWindow1(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s, 'window1', TexCell.WINDOW1);
  }
  static uniformWindow1(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.uniformWindows(s, 'window1', TexCell.WINDOW1);
  }

  static scatterWindow2(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s, 'window2', TexCell.WINDOW2);
  }

  static scatterWindows(s: ShapeNode, windowName: string, windowTex: TexCell = 0): Array<ShapeNode> {
    // console.log("scatterWindows");
    s.symbol = 'window';
    s.terminal = true;
    let master = s.getMaster()
    let randWind = master['window']

    for (let i = 0; i < s.children.length; i++) {
      let randXScale = 0.5 + 0.2 * Math.random();
      let randZScale = 0.5 + 0.2 * Math.random();

      for (let j = 0; j < s.children[i].children.length; j++) {
        if (s.children[i].children[j].symbol == 'window cell') {
          let wind = new ShapeNode();
          wind.position[1] = 0.001;
          wind.meshname = 'plane';
          wind.tex_cell = randWind;
          wind.scale[0] = randXScale;
          wind.scale[2] = randZScale;

          s.children[i].children[j].addChild(wind);//windowName;
        }
        //s.children[i].children[j].tex_cell = randWind;
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

  static door1(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door1');
  }

  static door2(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door2');
  }


  static door3(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door3');
  }

  static door4(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door4');
  }

  static door5(s: ShapeNode): Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door5');
  }

  static addDoor(s: ShapeNode, doorName: string): Array<ShapeNode> {
    // console.log("addDoor");
    s.symbol = 'door';
    s.terminal = true;
    let master = s.getMaster()
    //s.meshname = 'door1';
    for (let i = 0; i < s.children.length; i++) {
      let randInd = Math.floor(Math.random() * s.children[i].children.length);
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
          // wind.scale[0] = randXScale;
          //wind.scale[2] = randZScale;

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
    this.finishedLoading = false;
    this.m_size = 0.1

    this.fillAList();
    this.fillBList();
    this.fillCList();
    this.fillRoofTypeList();
    this.fillRoofDecorationList();
    this.fillFirstSubdivList();
    this.fillDList();
    this.fillFacadeList();

    this.fillFList();
    this.fillEntranceList();
    this.fillDoorList();

  }


  refreshGrammar() {
    this.fillAxiom();
    this.fillMeshNames();

  }



  faceToBoundingBox(face: Array<GraphVertex>) {
    let res = new Array<ShapeNode>()
    let bb = GraphVertex.boundingBoxFromVerts(face)
    let center = bb.getCenter()
    let parent = new ShapeNode();
    parent.position = vec3.fromValues(center[0], 0.5, center[1])
    parent.symbol = 'start'

    if (face.length >= 2) {
      let p1 = face[0].pos;
      let p2 = face[1].pos;
      let dir = vec3.create()
      let pos = vec3.create()
      vec3.lerp(pos, p2, p1, 0.5)
      vec3.subtract(pos, pos, parent.position)
      let xaxis = vec3.fromValues(1, 0, 0)

      vec3.subtract(dir, p2, p1)
      let xz = vec2.fromValues(dir[0], dir[2])
      let xax2 = vec2.fromValues(1, 0)

      let o = Math.sign(Utils.crossVec2(xz, xax2))
      let rot = vec3.angle(xaxis, dir)

      if (o == -1) {
        rot *= -1
      }

      parent.rotation[1] = Utils.radiansToDegrees(rot)
    }
    //console.log('parent rot ' + parent.rotation)
    res.push(parent)
    parent.scale[0] = 0.6
    parent.scale[2] = 0.6

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

  /*
  let orient = 0;
  for(let i = 0; i < face.length;i++) {
    let p1 = face[i].pos
    let p2 = face[(i + 1) % face.length].pos
    orient += (p2[0] - p1[0]) * (p2[2] + p1[2])
  }
  if(orient > 0) {
    ccw = true
  }
  */

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
    for (let i = 0; i < this.m_roads.faces.length; i++) {
      let face = this.m_roads.faces[i]
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

  drawRoads() {
    let i = 0;

    this.m_roads.adjList.forEach((v1: GraphVertex) => {
      v1.neighbors.forEach((v2: GraphVertex) => {
        //this.drawVertex(v1)
        //this.drawVertex(v2)
        i++;
        let segVec = vec3.create()
        vec3.subtract(segVec, v2.pos, v1.pos);
        vec3.normalize(segVec, segVec)
        let crossVec = vec3.create();
        vec3.cross(crossVec, vec3.fromValues(0, 1, 0), segVec)
        vec3.normalize(crossVec, crossVec);

        let v1_off = vec3.create()
        vec3.scaleAndAdd(v1_off, v1.pos, segVec, 0.15)

        let v2_off = vec3.create()
        vec3.scaleAndAdd(v2_off, v2.pos, segVec, -0.15)

        let y = 0.00001 * i
        let planemesh = this.drawPlaneBetween(v1.pos, v2.pos, crossVec, 0.15, y)
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



        if (Math.random() > 0.3) {
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
    s.scale[0] = this.m_size * 0.2
    s.scale[2] = this.m_size * 0.2
    let lastDig = Utils.randomIntRange(1,4)
    s.meshname = 'tree' + lastDig
    //console.log("lastdig " + lastDig)
    s.tex_cell = TexCell.TREETRUNK1
    s.rotation[1] = 180 * Math.random()
    s.flip_uvy = true
    s.global_tex = true

    ShapeNodeFunctions.setScaleAboutMinEnd(s, 1, this.m_size * 0.2 + Math.random() * this.m_size * 0.05);


  }

  fillAxiom() {
    this.m_roads = new Roads()
    this.m_roads.resetBoundsSquare(this.gridDivs)
    this.m_roads.expandAxiom();
    this.m_roads.expandSegments();
    // this.m_roads.findFaces()
    this.m_roads.fillMesh();
    this.drawRoads();
    //this.drawGround();

    //this.m_roads.createAll()
    //ground plane
    let g = new ShapeNode();
    g.meshname = 'cube'
    //celsize
    let cs = this.cell_size;
    g.scale = vec3.fromValues(this.gridDivs * cs * 1.2, 0.1, this.gridDivs * cs * 1.2);
    g.terminal = true;
    g.tex_cell = TexCell.ROOF2;
    let minCorner = vec3.fromValues(-this.gridDivs * cs * 0.5 + cs * 0.5,
      0, -this.gridDivs * cs * 0.5 + cs * 0.5);

    g.position = vec3.fromValues(0, -0.05, 0);
    g.position[2] += g.scale[2] * 0.5;

    let blocks = 0
    for (let i = 0; i < this.m_roads.faces.length; i++) {
      blocks++
      if(blocks > 10) {
        break
      }
      let face = this.m_roads.faces[i]
      let rounded = this.roundCorners(face)
      let lot = ShapeNodeFunctions.extrudeFace(rounded)[0]
      lot.scale[0] = 0.85
      lot.scale[2] = 0.85
      // lot.tex_cell = Utils.randomIntRange(TexCell.FACADE1, TexCell.DOOR2)
     // console.log("lot tex " + lot.tex_cell)
      ShapeNodeFunctions.setScaleAboutMinEnd(lot, 1, 0.01)
      for (let c = 0; c < lot.children.length; c++) {
        for(let cc =0 ; cc < lot.children[c].children.length; cc++) {
          lot.children[c].children[cc].tex_cell = TexCell.GRAVEL1

        }
        lot.children[c].tex_cell = TexCell.GRAVEL1

      }
      this.root.addChild(lot)


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
      let treedist = Math.random() * 0.2 + 0.1
      let treeVar = Math.random() + 0.1

      let res1 = ShapeNodeFunctions.boxesAlongEdges(face, 0.75, treedist, 0.7, 0.01, 0, 0.03)

      res1 = res1.concat(ShapeNodeFunctions.boxesAlongEdges(face, 0.2, treedist, 0.7, 0.01, 0, 0.03))


      for (let r = 0; r < res1.length; r++) {
        //res1[r].scale = vec3.fromValues(0.05,0.05,0.05)
        this.makeRandomTree(res1[r])

        this.root.addChild(res1[r])

        if(r > 5) {
          //break
        }
      }


      //let blocks = 5;
      if(face.length > 3) {

      
      let res = ShapeNodeFunctions.boxesAlongEdges(face, 0.55, 1.8 * this.m_size, 3 * this.m_size, this.m_size, this.m_size, 0.01)
      let bb = GraphVertex.boundingBoxFromVerts(face)
      let pos = bb.getCenter()
      //console.log("CENTER " + pos)
        for (let r = 0; r < res.length; r++) {
          let ys = 0.3 + 0.35 * (Utils.perlin(vec2.fromValues(res[r].position[0] * 1.6, res[r].position[2] * 1.6)) + 1);
          let randomMat = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE5)
          let geom = new ShapeNode()
          geom.tex_cell = randomMat
          geom.symbol = 'start'
          res[r].meshname = ''
          res[r].master = {
            'window': Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW10 + 1),
            'facade1': Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE10 + 1),
            'facade2': Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE10 + 1),
            'door': Utils.randomIntRange(TexCell.DOOR1, TexCell.DOOR5 + 1),
            'roof': Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF5 + 1),

          }

          res[r].position[1] += 0.01
          res[r].addChild(geom)
          ShapeNodeFunctions.setScaleAboutMinEnd(res[r], 1, ys * ys);
          this.shapes.push(geom)
          this.root.addChild(res[r])
        //break
        }
      } else {
        let res = ShapeNodeFunctions.boxesAlongEdges(face, 0.55, treedist, 0.7, 0.01, 0, 0.03)
        for (let r = 0; r < res.length; r++) {
          this.makeRandomTree(res[r])
          this.root.addChild(res[r])
  
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

  fillAList() {
    //initial shape of building
    this.symbolsToRules.set("start", new Array<FreqPair>());
    // this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.halve));
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stackY)); 
    //this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stretchRand));
    this.symbolsToRules.get("start").push(new FreqPair(0.2, ShapeNodeFunctions.passThrough));
    this.symbolsToRules.get("start").push(new FreqPair(0.5, ShapeNodeFunctions.growYOffsetX));
    this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.OffsetYSim));


  }

  fillStackList() {
    this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stackY));

  }

  fillBList() {
    //structure -> levels structure, roof and ceiling
    this.symbolsToRules.set("structure", new Array<FreqPair>());
    this.symbolsToRules.get("structure").push(new FreqPair(0.9, ShapeNodeFunctions.entranceLevelsRoof));

    this.symbolsToRules.get("structure").push(new FreqPair(0.1, ShapeNodeFunctions.entranceLevelsRoofHexagon));
  }


  fillCList() {
    //roofs
    this.symbolsToRules.set("roof", new Array<FreqPair>());
    this.symbolsToRules.get("roof").push(new FreqPair(0.3, ShapeNodeFunctions.decorateRoof));

  }

  fillRoofTypeList() {
    //roofs
    this.symbolsToRules.set("roof type", new Array<FreqPair>());
    this.symbolsToRules.get("roof type").push(new FreqPair(0.3, ShapeNodeFunctions.roof2));
    this.symbolsToRules.get("roof type").push(new FreqPair(0.3, ShapeNodeFunctions.roof3));

  }


  fillRoofDecorationList() {
    //roofs
    this.symbolsToRules.set("roof decor", new Array<FreqPair>());
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.03, ShapeNodeFunctions.spire));
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.03, ShapeNodeFunctions.spike));
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.watertower));
    // this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof1));
    //this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof2));

  }


  fillFirstSubdivList() {
    //planar facades -> further facade subdivisions
    this.symbolsToRules.set("level", new Array<FreqPair>());
    this.symbolsToRules.get("level").push(new FreqPair(0.6, ShapeNodeFunctions.divFacadePlaneSym));
    //this.symbolsToRules.get("level").push(new FreqPair(0.3, ShapeNodeFunctions.glassFacadePlane));


  }

  fillDList() {
    //facade subdivisions -> small subdivisions for windows, etc
    this.symbolsToRules.set("subdivA", new Array<FreqPair>());
    this.symbolsToRules.get("subdivA").push(new FreqPair(0.7, ShapeNodeFunctions.divHalvePlane));
    this.symbolsToRules.get("subdivA").push(new FreqPair(0.3, ShapeNodeFunctions.divAxisTest));
  }

  fillFacadeList() {
    //subdivisions -> windows
    this.symbolsToRules.set("subdivB", new Array<FreqPair>());
    //this.symbolsToRules.get("subdiv").push(new FreqPair(0.3, ShapeNodeFunctions.uniformWindow1));
    this.symbolsToRules.get("subdivB").push(new FreqPair(0.3, ShapeNodeFunctions.setFacadeMaterial));


  }

  fillFList() {
    //facade -> windows
    this.symbolsToRules.set("facade", new Array<FreqPair>());
    //this.symbolsToRules.get("subdiv").push(new FreqPair(0.3, ShapeNodeFunctions.uniformWindow1));
    this.symbolsToRules.get("facade").push(new FreqPair(0.3, ShapeNodeFunctions.scatterWindow1));
    this.symbolsToRules.get("facade").push(new FreqPair(0.3, ShapeNodeFunctions.scatterWindow2));


  }


  fillEntranceList() {
    //subdivisions -> windows
    this.symbolsToRules.set("entrance", new Array<FreqPair>());
    this.symbolsToRules.get("entrance").push(new FreqPair(0.3, ShapeNodeFunctions.divBottomFloor));

  }

  fillDoorList() {
    //subdivisions -> windows
    this.symbolsToRules.set("door", new Array<FreqPair>());
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door1));
    //this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door2));
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door3));
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door4));
    //this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door5));

  }


  applyRandomRule(s: ShapeNode) {
    let res: Array<ShapeNode> = new Array<ShapeNode>();

    if (!this.symbolsToRules.has(s.symbol)) {
      // console.log("no symbol found: " + s.symbol);
      res.push(s);
      return res;
    }

    let pairs = this.symbolsToRules.get(s.symbol);
    let rand = Math.random();
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

        if (previous[i].depth > previous[i].maxDepth && previous[i].maxDepth > -1) {
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
        let r = Math.random() * 0.3;
        let g = Math.random() * 0.7 + 0.3;
        let b = Math.random() * 0.4 + 0.6;

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
    console.log(this.fullMesh.tangents)
    this.fullMesh.create();
    for (let mesh of this.meshes) {
      //mesh.create();
    }
  }

};

export default ShapeGrammar;
