import {vec2, vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
import Utils from './Utils';
import Plane from './Plane';

var OBJ = require('webgl-obj-loader') ;

enum TexCell{
  FACADE1, 
  FACADE2, 
  FACADE3, 
  FACADE4, 
  WINDOW1,
  WINDOW2,
  WINDOW3, 
  ROOF1,
  ROOF2,
  ROOF3,
  DOOR1,
  DOOR2,
}

class ShapeNode {
  symbol: string;
  rotation: vec3;
  position: vec3;
  scale : vec3;
  meshname : string;
  terminal : boolean;
  depth : number;
  children : Array<ShapeNode>;
  maxDepth : number;
  tex_cell : number;

  constructor() {
    this.maxDepth = -1;
    this.symbol = "start";
    this.rotation = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0.0,0);
    this.scale = vec3.fromValues(1,1,1);
    this.meshname = 'cube';
    this.terminal = false;
    this.depth = 0;
    this.tex_cell = 2;

    this.children = new Array<ShapeNode>();
  }

  copyshallow(t : ShapeNode) {
    vec3.copy(this.position, t.position);
    vec3.copy(this.rotation, t.rotation);
    vec3.copy(this.scale, t.scale);
    this.meshname = t.meshname;
    this.symbol = t.symbol;
    this.terminal = t.terminal;
    this.depth = t.depth;
  }
}

class FreqPair {
  freq: number;
  rule: (arg0 : ShapeNode)=> Array<ShapeNode>;
  constructor(f : number, r : (arg0 : ShapeNode)=> Array<ShapeNode>) {
    this.freq = f;
    this.rule = r;
  }
}


class ShapeNodeFunctions {
  static scaleAboutMinEnd(s : ShapeNode, axis : number, scale : number) {
    let initPos = s.position[axis] - s.scale[axis] * 0.5;
    s.scale[axis] += scale;
    s.position[axis] = initPos + s.scale[axis] * 0.5;
  }

  static scaleAboutMaxEnd(s : ShapeNode, axis : number, scale : number) {
    let initPos = s.position[axis] + s.scale[axis] * 0.5;
    s.scale[axis] += scale;
    s.position[axis] = initPos - s.scale[axis] * 0.5;
  }


  static splitAlong(s : ShapeNode, frac : number, ind : number) : Array<ShapeNode> {
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


  static splitAlongSym(s : ShapeNode, frac : number, ind : number) : Array<ShapeNode> {
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



  static passThrough(s : ShapeNode) : Array<ShapeNode> {
    if(s.depth > 1) {
      s.symbol = "structure"
    }
    return new Array<ShapeNode>(s);
  }

  static stretchRand(s : ShapeNode) : Array<ShapeNode> {
    if(s.depth > 1) {
      s.symbol = "structure"
    }
    //let x = Math.random() * 0.7;
    let y = Math.random() * 2;
    //let z = Math.random() * 0.7;

    ShapeNodeFunctions.scaleAboutMinEnd(s, 1, y);
    return new Array<ShapeNode>(s);
  }

  static roof1(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof1';
    s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);
    return new Array<ShapeNode>(s);
  }


  static roof2(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof2';
    s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);

    return new Array<ShapeNode>(s);

  }

  static roof3(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof3';
    s.tex_cell = Utils.randomIntRange(TexCell.ROOF1, TexCell.ROOF3 + 1);

    return new Array<ShapeNode>(s);

  }

  
  static watertower(s : ShapeNode) : Array<ShapeNode> {
    //ensure water tower is not skewed
    let smin = Math.max(Math.min(s.scale[0], s.scale[2]), 0.5);
    s.scale = vec3.fromValues(smin, smin, smin);
    s.meshname = 'watertower';
    s.tex_cell = TexCell.ROOF2;

    return new Array<ShapeNode>(s);

  }


  static growYOffsetX(s : ShapeNode) : Array<ShapeNode> {
    console.log("growYOffsetX");
    //console.log("S DEPTH" + s.depth);

    let axis = Math.random() < 0.5 ? 0 : 2;
    let bAxis = axis == 0 ? 2 : 0;
    if(s.depth > 1) {
      console.log("GREATER DEPTH");

      s.symbol = "structure"
    }

    if(s.scale[axis] < 0.9) {
      return new Array<ShapeNode>(s);
    }
    let randoff = 0.3 + 0.4 * Math.random();

    let res = ShapeNodeFunctions.splitAlong(s, randoff, axis);
    let dup = res[1];
    let randy = Math.random() - 0.2;
    let randb = Math.random();

    vec3.add(dup.scale, dup.scale, vec3.fromValues(0,randy,0));

    let bScale = Math.max(-randb, -dup.scale[bAxis] * 0.2);

    ShapeNodeFunctions.scaleAboutMinEnd(dup, bAxis, bScale);
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));

    dup.position[1] = dup.scale[1] * 0.5; 
    s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static fracFromWorldSize(s: ShapeNode, size : number, axis : number) {
    return size / s.scale[axis];
  }

  static OffsetYSim(s : ShapeNode) : Array<ShapeNode> {
    console.log("OffsetYSim");

    let axis = Math.random() < 0.5 ? 0 : 2;
    let sign = Math.random() < 0.5 ? -1 : 1;

    if(s.depth > 1) {
      s.symbol = "structure"
    }

    if(s.scale[axis] < 2.1) {
      return new Array<ShapeNode>(s);
    }
    let randoff = 0.1 + 0.3 * Math.random();
    randoff = ShapeNodeFunctions.fracFromWorldSize(s, 0.9 + 0.1 * Math.random(), axis);
    randoff = Utils.clamp(randoff, 0.3, 0.4);
    let res = ShapeNodeFunctions.splitAlongSym(s, randoff, axis);
    let dup = res[1];
    let randy = (Math.random() * 0.9 + 0.3);
    randy = Utils.clamp(randy, s.scale[1] * 0.1, s.scale[1] * 0.5);
    randy = sign * randy;
    vec3.add(res[0].scale, res[0].scale, vec3.fromValues(0,randy,0));
    vec3.add(res[1].scale, res[1].scale, vec3.fromValues(0,0,0));
    vec3.add(res[2].scale, res[2].scale, vec3.fromValues(0,randy,0));

    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));

    res[0].position[1] = res[0].scale[1] * 0.5; 
    res[1].position[1] = res[1].scale[1] * 0.5; 
    res[2].position[1] = res[2].scale[1] * 0.5; 

    s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }


  //creates faces of the cube and adds them as children to node s
  static replaceCubeWithPlanes(s : ShapeNode, excludeTop = false) {
    console.log("replacewplanes");
    let res = new Array<ShapeNode>();

    //s.symbol = "plane";
    s.meshname = "";
    for(let i = 0; i < 3; i++) {
      //i is the axis of rotation
      //translation axis
      let ti = 1;
      if(i != 1) {
        ti = (i + 2) % 3;
      }
      for(let j = -1; j <= 1; j+=2) {
        if((i == 1 && j == -1) || (i == 1 && excludeTop)) {
          continue;
        }
        let xyPos = new ShapeNode();
        xyPos.meshname = '';
        let xyPlane = new ShapeNode();
        xyPlane.meshname = "plane";
        xyPos.children.push(xyPlane);
       // xyPos.copyshallow(s);
        //xyPos.meshname =  "plane";
        xyPos.position[1] = 0;

        if(i == 0) {
          //xy plane
          let faceRot = j == -1 ? 1 : 0;

          xyPos.rotation[0] = 90;
          xyPos.rotation[2] = 180 * faceRot;

          xyPos.position[2] += j * 0.5;
          xyPos.scale[1] = 1.0 / s.scale[2];


        } else if (i == 1) {
          //xz plane
          xyPos.position[1] += j * 0.5;  
          
        } else {
          //yz plane
          let faceRot = j == -1 ? 0 : 1;

          xyPos.rotation[0] = 90;
          xyPos.rotation[2] = 90 + 180 * faceRot;
          xyPos.position[0] += j * 0.5;
          xyPos.scale[1] = 1.0 / s.scale[0];

        }

        s.children.push(xyPos);

      }
      
    }

    //console.log(res);
    //return new Array<ShapeNode>(s);
  }

  static decorateRoof(s : ShapeNode) : Array<ShapeNode> {
    console.log("decorateRoof");
    s.symbol = "roof type";
    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);

    let randS = Math.random() * 0.2 + 0.5;
    vec3.scale(dup.scale, dup.scale, randS);
    //let randoff = 0;
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));
    dup.position[1] = s.position[1] + s.scale[1] * 0.5 + dup.scale[1] * 0.5; 
    dup.symbol = "roof decor";
   // s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static stackY(s : ShapeNode) : Array<ShapeNode> {
    console.log("growYOffsetX");
    console.log("S DEPTH" + s.depth);

    if(s.depth >= 1) {

      s.symbol = "structure"
    }
    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);

    let randStretch = -Math.random() * 0.5;
    let randStretchZ = -Math.random() * 0.5;
    let randStretchX = -Math.random() * 0.5;
    let randS = Math.random() * 0.2 + 0.1;
    vec3.scale(dup.scale, dup.scale, randS);
    //let randoff = 0;
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));

    dup.position[1] = s.position[1] + s.scale[1] * 0.5 + dup.scale[1] * 0.5; 
   // s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }


  static entranceLevelsRoof(s : ShapeNode) : Array<ShapeNode> {
    console.log("entranceLevelsRoof");
    let bottomSize = Math.min(0.3 / s.scale[1], 0.3);
    s.meshname = '';
    //s.meshname = 'cube';
    let res = ShapeNodeFunctions.splitAlong(s, bottomSize, 1);
    res[0].symbol = "entrance";
    res[1].symbol = "level";

    let roofSize = Math.min(0.03 / s.scale[1], 0.03);
    res.push(ShapeNodeFunctions.splitAlong(res[1], 1 - roofSize, 1)[1]);
    res[2].meshname = 'cube'
     res[2].symbol = "roof";
    //res[2].meshname = "cube";
    ShapeNodeFunctions.replaceCubeWithPlanes(res[0], true);
    ShapeNodeFunctions.replaceCubeWithPlanes(res[1], true);
   // ShapeNodeFunctions.replaceCubeWithPlanes(res[2], false);

    return res;
  }

  static divBySize(s : ShapeNode) : Array<ShapeNode> {
    console.log("divBySize");
    s.terminal = true;
    let windowX = 0.3 + 0.9 * Math.random();
    let windowY = 0.3 + 0.9 * Math.random();
    let windowZ = 0.3 + 0.9 * Math.random();

    let xDiv = Math.ceil(s.scale[0] / windowX);
    let yDiv = Math.ceil(s.scale[1] / windowY);
    let zDiv = Math.ceil(s.scale[2] / windowZ);

    return ShapeNodeFunctions.divideUniform(s, xDiv,yDiv,zDiv);
  }

  static divBottomFloor(s : ShapeNode) : Array<ShapeNode> {
    console.log("divbottomfloor");
    s.symbol = "door";
    return ShapeNodeFunctions.divUniformRandomSize(s, 0.7, 0.05, s.scale[1] + 10, 0.0);
  }


  static dividePlane(s : ShapeNode, xDivs : number, yDivs : number) {
    console.log("DIVIDE PLANE");  
    //plane is originally in xz plane
    let res = new Array<ShapeNode>();
    //s.meshname = "plane";

    let d = vec3.fromValues(s.scale[0] / xDivs, 1, s.scale[2] / yDivs);
    let minCorner = vec3.fromValues(-s.scale[0] * 0.5 + d[0] * 0.5, 0, -s.scale[2] * 0.5 + d[2] * 0.5);
    vec3.add(minCorner, minCorner, s.position);
    for(let i = 0; i < xDivs; i++) {
      for(let j = 0; j < yDivs; j++) {
        if(i == 0 && j == 0) {
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

        // if(parentNode !== undefined) {
        //   parentNode.children.push(dup);

        // }
        //s.children.push(dup);
        //s.meshname = '';
      }
    }
    return res;
  }


  static divUniformRandomSize(s : ShapeNode, xMin : number, xVar : number, yMin : number, yVar : number) : Array<ShapeNode> {
    for(let i = 0; i < s.children.length; i++) {
      let newChildren = new Array<ShapeNode>();

      for(let j = 0; j < s.children[i].children.length; j++) {
        if(s.children[i].children[j].terminal) {
          continue;
        }
        let windowX = xMin + xVar * Math.random();
        let windowY = yMin + yVar * Math.random();  
        //check which face of the cube this is on (x or z)
        if(s.children[i].position[0] == 0) {
          // xy plane
          let xDiv = Math.ceil(s.scale[0] * s.children[i].children[j].scale[0] / windowX);
          let yDiv = Math.ceil(s.scale[1] * s.children[i].children[j].scale[2] / windowY);  
          let dups = ShapeNodeFunctions.dividePlane(s.children[i].children[j], xDiv, yDiv);
          newChildren = newChildren.concat(dups);
        } else {
          // yz plane
          let xDiv = Math.ceil(s.scale[2] * s.children[i].children[j].scale[0] / windowX);
          let yDiv = Math.ceil(s.scale[1] * s.children[i].children[j].scale[2] / windowY);  
          let dups = ShapeNodeFunctions.dividePlane(s.children[i].children[j], xDiv, yDiv);
          newChildren = newChildren.concat(dups);

        }
      }
      s.children[i].children = s.children[i].children.concat(newChildren);

    }
    return new Array<ShapeNode>(s);

  }


  static divHalvePlane(s : ShapeNode) : Array<ShapeNode> {
    console.log("divHalvePlane");
    s.symbol = 'subdivB';

    return ShapeNodeFunctions.divUniformRandomSize(s, 0.4, 0.1, 0.4, 0.1);
  }

  static divFacadePlaneSym(s : ShapeNode) : Array<ShapeNode> {
    console.log("divFacadePlane");
    s.symbol = 'subdivA';
    s.meshname = '';
    //s.terminal = true;

    for (let i = 0 ; i < s.children.length; i++) {
      let newChildren = new Array<ShapeNode>();
      for(let j = 0; j < s.children[i].children.length; j++) {
        let shp = s.children[i].children[j];
        shp.symbol = 'plane'; 
        shp.meshname = 'plane'; 

        shp.tex_cell = TexCell.ROOF1;
        s.children[i].meshname = '';  

        //shp.position[1] = 0.0;
        //newChildren.push(shp); 
        let randdiv = Utils.randomIntRange(2,5);
        let div = ShapeNodeFunctions.dividePlane(shp, 1, randdiv);
        let randF = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);
        let randF2 = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);

        div.push(shp)
        for(let d = 0; d < div.length; d++) {
            let splitSize = Utils.randomFloatRange(0.05, 0.1);
            //newChildren.push(div[d]);
            //div[d].tex_cell = randF;
            
           let r = ShapeNodeFunctions.splitAlong(div[d], splitSize, 2);
            r[0].symbol ='pillar';
            r[1].symbol ='window cell';
            r[0].tex_cell = randF2;
            r[0].meshname = 'extrudeplane';
            r[1].tex_cell = randF;

            let rx = ShapeNodeFunctions.splitAlongSym(r[1], 0.1, 0);
            rx[0].symbol = 'pillar'
            rx[0].tex_cell = randF
            rx[2].tex_cell = randF

            rx[2].symbol = 'pillar'

            newChildren.push(rx[0])
            newChildren.push(rx[2])
            r[1].meshname = 'window3';

            newChildren.push(r[1])

            //newChildren.push(r[2])

            if(div[d] !== shp) {
              newChildren.push(r[0])

            }


        }

        console.log(s.children[i]);
      }

      s.children[i].children = s.children[i].children.concat(newChildren)
    }
    
    return new Array<ShapeNode>(s);

  }

  static divFacadePlaneNonSym(s : ShapeNode) : Array<ShapeNode> {
    console.log("divFacadePlane");
    s.symbol = 'subdivA';
    s.meshname = '';
    //s.terminal = true;
    
    for (let i = 0 ; i < s.children.length; i++) {
      let shp = new ShapeNode();
      shp.symbol = 'plane'; 
      shp.meshname = 'plane'; 

      shp.tex_cell = TexCell.ROOF1;
      s.children[i].meshname = '';  

      //shp.position[1] = 0.0;
      //s.children[i].children.push(shp);
      let r = ShapeNodeFunctions.splitAlong(shp, 0.2, 0);
      r[0].symbol ='pillar';
      r[1].symbol ='window cell';

      s.children[i].children.push(r[1])

      console.log(s.children[i]);

    }
    
    return new Array<ShapeNode>(s);

  }


  static divideUniform(s : ShapeNode, xDivs : number, yDivs : number, zDivs :number) : Array<ShapeNode> {
    let res = new Array<ShapeNode>();
    let minCorner = vec3.create();
    vec3.scaleAndAdd(minCorner, s.position, s.scale, -0.5);

    // the size of a divided unit
    let d = vec3.fromValues(s.scale[0] / xDivs, s.scale[1] / yDivs, s.scale[2] / zDivs);
    vec3.scaleAndAdd(minCorner, minCorner, d, 0.5);

    for(let i = 0; i < xDivs; i++) {
      for(let j = 0; j < yDivs; j++) {
        for(let k = 0; k < zDivs; k++) {
          let dup = new ShapeNode();
          dup.copyshallow(s);
          vec3.copy(dup.scale, d);
          vec3.add(dup.position, minCorner, vec3.fromValues(d[0] * i, d[1] * j, d[2] * k));
          res.push(dup);
        }
      }
    }
    //console.log("dupcliate and offset " + res);
    return res;

  }


  static shrinkStretch(s : ShapeNode) : Array<ShapeNode> {
    console.log("shrinkStretch");

    let res = new Array<ShapeNode>();
    let dup = new ShapeNode();
    dup.copyshallow(s);
    let randoff = (Math.random() - 0.5) * dup.scale[2];
    vec3.add(dup.scale, dup.scale, vec3.fromValues(-0.1,1.0,-0.1));
    vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,0.0));
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static setFacadeMaterial(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.uniformFacade(s, '', 0);
  }

  static uniformFacade(s : ShapeNode, windowName : string, windowTex : TexCell = 0) : Array<ShapeNode> {
    console.log("uniformFacade");
    s.symbol = 'facade';

    for (let i = 0; i < s.children.length; i++) {
      let randWind = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);
      let randWind2 = Utils.randomIntRange(TexCell.FACADE1, TexCell.FACADE4 + 1);

      for(let j = 0; j < s.children[i].children.length; j++) {
        //s.children[i].children[j].meshname = 'plane';//windowName;
        if(s.children[i].children[j].symbol == "window cell") {
          //s.children[i].children[j].tex_cell = randWind;

        } else {
          //s.children[i].children[j].tex_cell = randWind2;

        }
      }
    }
    return new Array<ShapeNode>(s);
  }

  static scatterWindow1(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s, 'window1', TexCell.WINDOW1);
  }
  static uniformWindow1(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.uniformWindows(s, 'window1', TexCell.WINDOW1);
  }

  static scatterWindow2(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.scatterWindows(s, 'window2', TexCell.WINDOW2);
  }

  static scatterWindows(s : ShapeNode, windowName : string, windowTex : TexCell = 0) : Array<ShapeNode> {
    console.log("scatterWindows");
    s.symbol = 'window';
    s.terminal = true;
    let randWind = Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW3 + 1);

    for (let i = 0; i < s.children.length; i++) {
      let randXScale = 0.5 + 0.2 * Math.random();
      let randZScale = 0.5 + 0.2 * Math.random();

      for(let j = 0; j < s.children[i].children.length; j++) {
        if(s.children[i].children[j].symbol == 'window cell') {
          let wind = new ShapeNode();
          wind.position[1] = -0.01;
          wind.meshname = 'plane';
          wind.tex_cell = randWind;
          wind.scale[0] = randXScale;
          wind.scale[2] = randZScale;

          s.children[i].children[j].children.push(wind);//windowName;
        }
          //s.children[i].children[j].tex_cell = randWind;
        }
      
    }
    return new Array<ShapeNode>(s);

  }

  static uniformWindows(s : ShapeNode, windowName : string, windowTex : TexCell = 0) : Array<ShapeNode> {
    console.log("addWindows");
    s.symbol = 'window';
    s.terminal = true;
    let randWind = Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW3 + 1);

    for (let i = 0; i < s.children.length; i++) {
      for(let j = 0; j < s.children[i].children.length; j++) {
        let wind = new ShapeNode();
        wind.position[1] = 0.001;
        wind.meshname = 'plane';
        wind.tex_cell = randWind;
        wind.scale[0] = 0.8;
        wind.scale[2] = 0.8;

        s.children[i].children[j].children.push(wind);//windowName;
      }
    }
    return new Array<ShapeNode>(s);
  }



  static halve(s : ShapeNode) : Array<ShapeNode> {
    console.log("halve");
    if(s.depth > 1) {
      s.symbol = "structure"
    }
    return ShapeNodeFunctions.splitAlong(s, 0.7, 0);
  }

  static door1(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door1');
  }

  static door2(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door2');
  }


  static door3(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door3');
  }

  static door4(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door4');
  }

  static door5(s : ShapeNode) : Array<ShapeNode> {
    return ShapeNodeFunctions.addDoor(s, 'door5');
  }

  static addDoor(s : ShapeNode, doorName : string) : Array<ShapeNode> {
    console.log("addDoor");
    s.symbol = 'door';
    s.terminal = true;
    //s.meshname = 'door1';
    for (let i = 0; i < s.children.length; i++) {
      let randInd = Math.floor(Math.random() * s.children[i].children.length);
      let randWind = Utils.randomIntRange(TexCell.WINDOW1, TexCell.WINDOW3 + 1);

      for(let j = 0; j < s.children[i].children.length; j++) {

        if(j !== randInd) {
          s.children[i].children[j].meshname = 'plane';
          s.children[i].children[j].tex_cell = randWind;
        } else {
          s.children[i].children[j].meshname = doorName;

        }
      }
    }
    
    return new Array<ShapeNode>(s);

  }

  
}


class ShapeGrammar  {
  axiom : string;
  buffer: ArrayBuffer;
  indices: Uint32Array;
  positions: Float32Array;
  normals: Float32Array;
  iterations :number;
  center: vec4;
  shapes : Array<ShapeNode>;
  meshes : Array<Mesh>;
  fullMesh : Mesh;
  randomColor : boolean;
  meshNames : Map<string, Mesh>;
  gridDivs:number;
  charExpansions : Map<string, string>;
  symbolsToRules : Map<string, Array<FreqPair>>;
  expandedSentence : string;
  cell_size : number;
  orientRand : number;
  constructor() {
    this.axiom = "X";
    this.shapes = new Array<ShapeNode>();
    this.meshes = new Array<Mesh>();
    this.iterations = 3;
    this.charExpansions = new Map();
    this.symbolsToRules = new Map();
    this.expandedSentence = "";
    this.orientRand = 0;
    this.fullMesh = new Mesh("", vec3.fromValues(0,0,0));
    this.randomColor = false;
    this.cell_size = 4;
    this.gridDivs = 3;
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

  fillAxiom() {
    //ground plane
    let g = new ShapeNode();
    g.meshname = 'cube'
    //celsize
    let cs = this.cell_size;
    g.scale = vec3.fromValues(this.gridDivs * cs * 1.2, 0.1, this.gridDivs * cs * 1.2);
    g.terminal = true;
    g.tex_cell = TexCell.ROOF2;
    let minCorner = vec3.fromValues(-this.gridDivs * cs * 0.5 + cs * 0.5, 
      0,-this.gridDivs * cs * 0.5 + cs * 0.5);

      g.position = vec3.fromValues(0, -0.05, 0);
      g.position[2] += g.scale[2] * 0.5;
    this.shapes.push(g);    

    for(let x = 0; x < this.gridDivs; x++) {
      for(let z = 0; z < this.gridDivs; z++) {
        let xs = Math.random() * 3;
        let ys = 0.5 * (Utils.perlin(vec2.fromValues(x * 1.6, z * 1.6)) + 1);
        let zs = Math.random() * 3;

        if(ys > 0.0) {
          let s = new ShapeNode();
          s.symbol = 'start';
          s.position = vec3.fromValues(x * cs, 0.5, z * cs);
          vec3.add(s.position, s.position, minCorner);
          console.log('YS', ys);
          vec3.add(s.scale, vec3.fromValues(xs,0.0,zs), s.scale);
          ShapeNodeFunctions.scaleAboutMinEnd(s, 1, ys * ys * 9);
          //s.rotation[1] = 30 * Math.random();
          //s.position[1] = s.scale[1] * 0.5; 
          s.position[2] += g.scale[2] * 0.5;

          this.shapes.push(s);      
        }
      }
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

      'door1': './geo/door1.obj',
      'door2': './geo/door2.obj',
      'door3': './geo/door3.obj',
      'door4': './geo/door4.obj',
      'door5': './geo/door5.obj',
      'extrudeplane': './geo/extrudeplane.obj'

    }, (meshes: any) => {

      for (let item in meshes) {
        console.log("Item" + item.toString());
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
    
    });
  }

  fillAList() {
    //initial shape of building
    this.symbolsToRules.set("start", new Array<FreqPair>());
   // this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.halve));
   //this.symbolsToRules.get("start").push(new FreqPair(0.1, ShapeNodeFunctions.stackY)); 
   this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.stretchRand));
   this.symbolsToRules.get("start").push(new FreqPair(0.2, ShapeNodeFunctions.passThrough));
   this.symbolsToRules.get("start").push(new FreqPair(0.5, ShapeNodeFunctions.growYOffsetX));
   this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.OffsetYSim));


  }

  fillBList() {
    //structure -> levels structure, roof and ceiling
    this.symbolsToRules.set("structure", new Array<FreqPair>());
    this.symbolsToRules.get("structure").push(new FreqPair(1.0, ShapeNodeFunctions.entranceLevelsRoof));
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
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.watertower));
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof1));
    this.symbolsToRules.get("roof decor").push(new FreqPair(0.3, ShapeNodeFunctions.roof2));

  }


  fillFirstSubdivList() {
    //planar facades -> further facade subdivisions
    this.symbolsToRules.set("level", new Array<FreqPair>());
    this.symbolsToRules.get("level").push(new FreqPair(0.3, ShapeNodeFunctions.divFacadePlaneSym));
   // this.symbolsToRules.get("level").push(new FreqPair(0.3, ShapeNodeFunctions.divFacadePlaneNonSym));

  }

  fillDList() {
    //facade subdivisions -> small subdivisions for windows, etc
    this.symbolsToRules.set("subdivA", new Array<FreqPair>());
    this.symbolsToRules.get("subdivA").push(new FreqPair(0.3, ShapeNodeFunctions.divHalvePlane));
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
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door2));
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door3));
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door4));
    this.symbolsToRules.get("door").push(new FreqPair(0.2, ShapeNodeFunctions.door5));

  }


  applyRandomRule(s : ShapeNode) {
    let res :  Array<ShapeNode> = new  Array<ShapeNode>();

    if(!this.symbolsToRules.has(s.symbol)) {
      console.log("no symbol found: " + s.symbol);
      res.push(s);
      return res;
    }
    
    let pairs = this.symbolsToRules.get(s.symbol);
    let rand = Math.random();
    let curr = 0;

    for(let i = 0; i < pairs.length; i++) {
      curr += pairs[i].freq;
      if(rand < curr || i == pairs.length - 1) {
        res = pairs[i].rule(s);
        return res;
      }
    }
    //res.push(s)
    return res;
  }


  expandGrammar() {

    let expanded = this.shapes;

    for(let k = 0; k < this.iterations; k++) {
      let previous = expanded;
      expanded = new Array<ShapeNode>();

      for(let i = 0; i < previous.length;i++) {
        //we want to prevent adding the same shapenode twice to the expansion
        let added = new Set<ShapeNode>();

        previous[i].depth = k;

        if(previous[i].depth > previous[i].maxDepth && previous[i].maxDepth > -1) {
          previous[i].terminal = true;
        }

        if(!previous[i].terminal) {
         let successors = this.applyRandomRule(previous[i]);

         for(let s = 0; s < successors.length; s++) {
           if(!added.has(successors[s])) {
            expanded.push(successors[s]);
            added.add(successors[s]);
           }
         }
        } else {
          if(!added.has(previous[i])) {
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

  loadMeshesRecursively(shapeNodes : Array<ShapeNode>, parentTrans : mat4) {
    for(let i = 0; i < shapeNodes.length;i++){

      let m = new Mesh(shapeNodes[i].meshname, shapeNodes[i].position, shapeNodes[i].scale, shapeNodes[i].rotation); 

      mat4.multiply(m.transform, parentTrans, m.transform);

      if(this.randomColor) {
        let r = Math.random() * 0.3;
        let g = Math.random() * 0.7 + 0.3;
        let b = Math.random() * 0.4 + 0.6;
  
        m.m_color[0] = r;
        m.m_color[1] = g;
        m.m_color[2] = b;
        m.uv_cell = Utils.randomIntRange(TexCell.WINDOW1, TexCell.DOOR1);

      } else {
       // m.m_color = vec4.fromValues(0.2 * shapeNodes[i].depth,0.8,0.8, 1.0);

        m.m_color = vec4.fromValues(0.5,0.8,0.8, 1.0);
        m.uv_cell = shapeNodes[i].tex_cell;

      }


      if(this.meshNames.has(shapeNodes[i].meshname)) {
        //console.log("now loading mesh: " + shapeNodes[i].meshname)
        this.fullMesh.transformAndAppend(this.meshNames.get(shapeNodes[i].meshname), m);
        //this.meshes.push(m);
      } else {
        //console.log("cannot find meshname: " + shapeNodes[i].meshname)
        m.enabled = false;
      }

      this.loadMeshesRecursively(shapeNodes[i].children, m.transform);
    }

  }

  loadMeshes() {
    this.loadMeshesRecursively(this.shapes, mat4.create());
    //this.meshes = new Array<Mesh>();
    
  }

  createAll() {
    console.log("fullmesh " + this.fullMesh);
    this.fullMesh.create();
    for(let mesh of this.meshes) {
      //mesh.create();
    }
  }

};

export default ShapeGrammar;
