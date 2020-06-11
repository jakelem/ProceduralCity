import {vec3, vec4, mat4} from 'gl-matrix';
import Drawable from '../rendering/gl/Drawable';
import {gl} from '../globals';
import Mesh from './Mesh';
var OBJ = require('webgl-obj-loader') ;

class ShapeNode {
  symbol: string;
  rotation: vec3;
  position: vec3;
  scale : vec3;
  meshname : string;
  terminal : boolean;
  depth : number;
  children : Array<ShapeNode>;

  constructor() {
    this.symbol = "start";
    this.rotation = vec3.fromValues(0,0,0);
    this.position = vec3.fromValues(0,0.5,0);
    this.scale = vec3.fromValues(1,1,1);
    this.meshname = 'cube';
    this.terminal = false;
    this.depth = 0;
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
  static splitAlong(s : ShapeNode, frac : number, ind : number) : Array<ShapeNode> {
    let res = new Array<ShapeNode>();
    s.depth += 1;
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
    s.depth += 1;
    let xSize = s.scale[ind];
    let xMin = s.position[ind] - xSize * 0.5;
    let xMax = s.position[ind] + xSize * 0.5;

    let left = xMin + frac * xSize * 0.5;
    let right = xMax - frac * xSize * 0.5;
    let dupl = new ShapeNode();
    let dupr = new ShapeNode();

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

  static stretchRand(s : ShapeNode) : Array<ShapeNode> {
    s.depth += 1;
    if(s.depth > 1) {
      s.symbol = "structure"
    }
    //let x = Math.random() * 0.7;
    let y = Math.random() * 2;
    //let z = Math.random() * 0.7;

    vec3.add(s.scale, vec3.fromValues(0,y,0), s.scale);
    s.position[1] = s.scale[1] * 0.5; 

    return new Array<ShapeNode>(s);
  }

  static roof1(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof1';
    return new Array<ShapeNode>(s);
  }


  static roof2(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof2';
    return new Array<ShapeNode>(s);

  }

  static roof3(s : ShapeNode) : Array<ShapeNode> {
    s.meshname = 'roof3';
    return new Array<ShapeNode>(s);

  }

  
  static watertower(s : ShapeNode) : Array<ShapeNode> {
    //ensure water tower is not skewed
    let smin = Math.max(Math.min(s.scale[0], s.scale[2]), 0.5);
    s.scale = vec3.fromValues(smin, smin, smin);
    s.meshname = 'watertower';
    return new Array<ShapeNode>(s);

  }


  static growYOffsetX(s : ShapeNode) : Array<ShapeNode> {
    console.log("growYOffsetX");

    s.depth += 1;
    let axis = Math.random() < 0.5 ? 0 : 2;

    if(s.depth > 1) {
      s.symbol = "structure"
    }

    if(s.scale[axis] < 0.9) {
      return new Array<ShapeNode>(s);
    }
    let randoff = 0.3 + 0.4 * Math.random();

    let res = ShapeNodeFunctions.splitAlong(s, randoff, axis);
    let dup = res[1];
    let randy = Math.random() - 0.2;

    vec3.add(dup.scale, dup.scale, vec3.fromValues(0,randy,0));
    //vec3.add(dup.position, dup.position, vec3.fromValues(0.0,0.0,randoff));

    dup.position[1] = dup.scale[1] * 0.5; 
    s.position[1] = s.scale[1] * 0.5; 
    res.push(s);
    res.push(dup);
    //console.log("dupcliate and offset " + res);
    return res;

  }

  static replaceCubeWithPlanes(s : ShapeNode) : Array<ShapeNode> {
    console.log("replacewplanes");
    let res = new Array<ShapeNode>();

    s.symbol = "plane";

    for(let i = 0; i < 3; i++) {
      //i is the axis of rotation
      //translation axis
      let ti = 1;
      if(i != 1) {
        ti = (i + 2) % 3;
      }
      for(let j = -1; j <= 1; j+=2) {
        let xyPos = new ShapeNode();
        xyPos.copyshallow(s);
        xyPos.meshname =  "plane";

        if(i == 0) {
          //xy plane
          xyPos.rotation[0] = 90 * j;
          xyPos.scale[0] = s.scale[0];
          xyPos.scale[2] = s.scale[1];  
          xyPos.position[2] += j * s.scale[2] * 0.5;
        } else if (i == 1) {
          //xz plane
          xyPos.scale[0] = s.scale[0];
          xyPos.scale[1] = j;
          xyPos.scale[2] = s.scale[2];  
          xyPos.position[1] += j * s.scale[1] * 0.5;
        } else {
          //yz plane
          xyPos.rotation[2] = -90 * j;
          xyPos.scale[0] = s.scale[1];
          xyPos.scale[2] = s.scale[2];  
          xyPos.position[0] += j * s.scale[0] * 0.5;

        }

        
        res.push(xyPos);
      }
      
    }
    return res;
  }

  static decorateRoof(s : ShapeNode) : Array<ShapeNode> {
    console.log("growYOffsetX");
    s.depth += 1;
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
    s.depth += 1;
    if(s.depth > 1) {
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
    let res = ShapeNodeFunctions.splitAlongSym(s, 0.2, 1);
    res[0].symbol = "ground";
    res[1].symbol = "level";
    res[2].symbol = "roof";
    return res;
  }


  static divBySize(s : ShapeNode) : Array<ShapeNode> {
    console.log("divHalves");
    s.terminal = true;
    let windowX = 0.3 + 0.9 * Math.random();
    let windowY = 0.3 + 0.9 * Math.random();
    let windowZ = 0.3 + 0.9 * Math.random();

    let xDiv = Math.ceil(s.scale[0] / windowX);
    let yDiv = Math.ceil(s.scale[1] / windowY);
    let zDiv = Math.ceil(s.scale[2] / windowZ);

    // if(s.depth > 1) {
    //   return new Array<ShapeNode>(s);
    // }
  //  return ShapeNodeFunctions.divideUniform(s, 3,2,4);


    return ShapeNodeFunctions.divideUniform(s, xDiv,yDiv,zDiv);
  }

  static divHalves(s : ShapeNode) : Array<ShapeNode> {
    console.log("divHalves");
    s.terminal = true;
    return ShapeNodeFunctions.divideUniform(s, 2,2,2);
  }


  static divHalvePlane(s : ShapeNode) : Array<ShapeNode> {
    console.log("divHalves");
    s.symbol = 'subdiv';

    let windowX = 0.5 + 0.4 * Math.random();
    let windowY = 0.5 + 0.4 * Math.random();

    let xDiv = Math.ceil(s.scale[0] / windowX);
    let yDiv = Math.ceil(s.scale[2] / windowY);

    return ShapeNodeFunctions.dividePlane(s, xDiv,yDiv);
  }


  static dividePlane(s : ShapeNode, xDivs : number, yDivs : number) : Array<ShapeNode> {
    console.log("DIVIDE PLANE");  
    //plane is originally in xz plane
    s.depth += 1;
    let res = new Array<ShapeNode>();

    let d = vec3.fromValues(1 / xDivs, 1, 1 / yDivs);
    let minCorner = vec3.fromValues(-0.5 + d[0] * 0.5, 0, -0.5 + d[2] * 0.5);
    for(let i = 0; i < xDivs; i++) {
      for(let j = 0; j < yDivs; j++) {
        let dup = new ShapeNode();
        //dup.copyshallow(s);
        dup.meshname = "plane";
        vec3.copy(dup.scale, d);
        vec3.add(dup.position, minCorner, vec3.fromValues(d[0] * i, 0, d[2] * j));
        s.children.push(dup);
        s.meshname = '';
      }
    }

    res.push(s);
    return res;


  }

  static divideUniform(s : ShapeNode, xDivs : number, yDivs : number, zDivs :number) : Array<ShapeNode> {
    s.depth += 1;
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

    s.depth += 1;
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

  static scatterWindows(s : ShapeNode) : Array<ShapeNode> {
    console.log("scatterWindows");
    s.depth += 1;
    s.symbol = 'window';
    s.terminal = true;
    for (let i = 0; i < s.children.length; i++) {
      if(i % 2 == 0) {
        s.children[i].meshname = 'window';
      }
    }
    return new Array<ShapeNode>(s);

  }

  static addWindows(s : ShapeNode) : Array<ShapeNode> {
  
    console.log("addWindows");
    s.depth += 1;
    s.symbol = 'window';
    s.terminal = true;
    for (let i = 0; i < s.children.length; i++) {
      s.children[i].meshname = 'window';
    }
    return new Array<ShapeNode>(s);
  }



  static halve(s : ShapeNode) : Array<ShapeNode> {
    console.log("halve");
    s.depth += 1;
    if(s.depth > 1) {
      s.symbol = "structure"
    }
    return ShapeNodeFunctions.splitAlong(s, 0.7, 0);
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

    this.gridDivs = 3;
    this.fillAList();
    this.fillBList();
    this.fillCList();
    this.fillRoofTypeList();
    this.fillRoofDecorationList();
    this.fillDList();

    this.fillEList();
    this.fillFList();


  }


refreshGrammar() {
  this.fillAxiom();
  this.fillMeshNames();

}

  fillAxiom() {
    //ground plane
    let g = new ShapeNode();

    //celsize
    let cs = 4;
    g.position = vec3.fromValues(0, -0.05, 0);
    g.scale = vec3.fromValues(this.gridDivs * cs * 1.2, 0.1, this.gridDivs * cs * 1.2);
    g.terminal = true;
    let minCorner = vec3.fromValues(-this.gridDivs * cs * 0.5 + cs * 0.5, 
      0,-this.gridDivs * cs * 0.5 + cs * 0.5);
    this.shapes.push(g);    


    for(let x = 0; x < this.gridDivs; x++) {
      for(let z = 0; z < this.gridDivs; z++) {
        let s = new ShapeNode();
        s.symbol = 'start';
        s.position = vec3.fromValues(x * cs, 0.5, z * cs);
        vec3.add(s.position, s.position, minCorner);
        let xs = Math.random() * 3;
        let ys = Math.random() * 5;
        let zs = Math.random() * 3;
    
        vec3.add(s.scale, vec3.fromValues(xs,ys,zs), s.scale);
        
        s.position[1] = s.scale[1] * 0.5; 
        this.shapes.push(s);    
      }
    }
  }

  fillMeshNames() {
    this.meshNames = new Map<string, Mesh>();
    OBJ.downloadMeshes({
      'cube': './geo/cube.obj',
      'window': './geo/windowplane.obj',
      'plane': './geo/plane.obj',
      'roof1': './geo/bevelroof.obj',
      'roof2': './geo/slantroof.obj',
      'roof3': './geo/outroof.obj',
      'watertower': './geo/watertower.obj'

    }, (meshes: any) => {
      let cube_mesh = new Mesh('/geo/cube.obj');
      cube_mesh.loadMesh(meshes.cube);
      let window_mesh = new Mesh('/geo/window.obj');
      window_mesh.loadMesh(meshes.window);
      let plane_mesh = new Mesh('/geo/plane.obj');
      plane_mesh.loadMesh(meshes.plane);
      let roof1_mesh = new Mesh('/geo/plane.obj');
      roof1_mesh.loadMesh(meshes.roof1);
      let roof2_mesh = new Mesh('/geo/plane.obj');
      roof2_mesh.loadMesh(meshes.roof2);
      let roof3_mesh = new Mesh('/geo/plane.obj');
      roof3_mesh.loadMesh(meshes.roof3);
      let watertower_mesh = new Mesh('/geo/plane.obj');
      watertower_mesh.loadMesh(meshes.watertower);

      this.meshNames.set("cube", cube_mesh);
      this.meshNames.set("window", window_mesh);
      this.meshNames.set("plane", plane_mesh);
      this.meshNames.set("roof1", roof1_mesh);
      this.meshNames.set("roof2", roof2_mesh);
      this.meshNames.set("roof3", roof2_mesh);
      this.meshNames.set("watertower", watertower_mesh);

      //this.loadMesh(meshes.mesh);
      this.expandGrammar();
      this.loadMeshes();
      this.createAll();
    
      //console.log()
    });
  }

  fillAList() {
    //initial shape of building
    this.symbolsToRules.set("start", new Array<FreqPair>());
   // this.symbolsToRules.get("a").push(new FreqPair(0.3, ShapeNodeFunctions.halve));
   this.symbolsToRules.get("start").push(new FreqPair(0.1, ShapeNodeFunctions.stackY)); 
   //this.symbolsToRules.get("a").push(new FreqPair(0.3, ShapeNodeFunctions.stretchRand));
   this.symbolsToRules.get("start").push(new FreqPair(0.3, ShapeNodeFunctions.growYOffsetX));

  }

  fillBList() {
    //structure -> levels structure, roof and ceiling
    this.symbolsToRules.set("structure", new Array<FreqPair>());
    this.symbolsToRules.get("structure").push(new FreqPair(0.3, ShapeNodeFunctions.entranceLevelsRoof));
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


  fillEList() {
    //levels -> planar facades
    this.symbolsToRules.set("level", new Array<FreqPair>());

   // this.symbolsToRules.get("e").push(new FreqPair(0.3, ShapeNodeFunctions.divBySize));
    this.symbolsToRules.get("level").push(new FreqPair(0.3, ShapeNodeFunctions.replaceCubeWithPlanes));
  }

  fillDList() {
    //planar facades -> subdivisions
    this.symbolsToRules.set("plane", new Array<FreqPair>());
    this.symbolsToRules.get("plane").push(new FreqPair(0.3, ShapeNodeFunctions.divHalvePlane));
  }

  fillFList() {
    //subdivisions -> windows
    this.symbolsToRules.set("subdiv", new Array<FreqPair>());
   this.symbolsToRules.get("subdiv").push(new FreqPair(0.3, ShapeNodeFunctions.addWindows));
   this.symbolsToRules.get("subdiv").push(new FreqPair(0.3, ShapeNodeFunctions.scatterWindows));

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
      if(i == pairs.length - 1) {
        return pairs[i].rule(s);
      }
      if(rand < curr) {
        return pairs[i].rule(s);

      }
    }
    res.push(s)
    return res;
  }


  expandGrammar() {

    let expanded = this.shapes;

    for(let k = 0; k < this.iterations; k++) {
      let previous = expanded;
      expanded = new Array<ShapeNode>();

      for(let i = 0; i < previous.length;i++) {
        if(!previous[i].terminal) {
         let successors = this.applyRandomRule(previous[i]);
         expanded = expanded.concat(successors);
        } else {
          expanded.push(previous[i]);
        }
    }
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
  
      } else {
        m.m_color = vec4.fromValues(0.5,0.8,0.8, 1.0);

      }

      if(this.meshNames.has(shapeNodes[i].meshname)) {
        console.log("now loading mesh: " + shapeNodes[i].meshname)
        this.fullMesh.transformAndAppend(this.meshNames.get(shapeNodes[i].meshname), m.transform, m.m_color);
        this.meshes.push(m);
      } else {
        console.log("cannot find meshname: " + shapeNodes[i].meshname)
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
