import {vec3, vec4, mat3, mat4} from 'gl-matrix';
import Drawable from './Drawable';
import {gl} from '../../globals';

var activeProgram: WebGLProgram = null;

export class Shader {
  shader: WebGLShader;

  constructor(type: number, source: string) {
    this.shader = gl.createShader(type);
    gl.shaderSource(this.shader, source);
    gl.compileShader(this.shader);

    if (!gl.getShaderParameter(this.shader, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(this.shader);
    }
  }
};

class ShaderProgram {
  prog: WebGLProgram;

  attrPos: number;
  attrNor: number;
  attrCol: number;
  attrUV: number;
  attrTan : number
  attrBit : number

  unifModel: WebGLUniformLocation;
  unifModelInvTr: WebGLUniformLocation;
  unifViewProj: WebGLUniformLocation;
  unifColor: WebGLUniformLocation;
  unifTime: WebGLUniformLocation;
  unifTexture: WebGLUniformLocation;
  unifBump:WebGLUniformLocation;
  unifLightViewProj : WebGLUniformLocation;
  unifShadowMap :WebGLUniformLocation;
  unifKernel : WebGLUniformLocation

  shadowMap : WebGLUniformLocation;
  texture:WebGLUniformLocation;
  bump:WebGLUniformLocation;
  unifCamPos:WebGLUniformLocation;
  constructor(shaders: Array<Shader>) {
    this.prog = gl.createProgram();

    for (let shader of shaders) {
      gl.attachShader(this.prog, shader.shader);
    }
    gl.linkProgram(this.prog);
    if (!gl.getProgramParameter(this.prog, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.prog);
    }

    this.attrPos = gl.getAttribLocation(this.prog, "vs_Pos");
    this.attrNor = gl.getAttribLocation(this.prog, "vs_Nor");
    this.attrCol = gl.getAttribLocation(this.prog, "vs_Col");
    this.attrUV = gl.getAttribLocation(this.prog, "vs_UV");
    this.attrTan = gl.getAttribLocation(this.prog, "vs_Tan");
    this.attrBit = gl.getAttribLocation(this.prog, "vs_Bit");

    this.unifModel      = gl.getUniformLocation(this.prog, "u_Model");
    this.unifModelInvTr = gl.getUniformLocation(this.prog, "u_ModelInvTr");
    this.unifViewProj   = gl.getUniformLocation(this.prog, "u_ViewProj");
    this.unifColor      = gl.getUniformLocation(this.prog, "u_Color");
    this.unifTime     = gl.getUniformLocation(this.prog, "u_Time");
    this.unifTexture     = gl.getUniformLocation(this.prog, "u_Texture");
    this.unifBump     = gl.getUniformLocation(this.prog, "u_NormalMap");
    this.unifShadowMap     = gl.getUniformLocation(this.prog, "u_ShadowMap");
    this.unifLightViewProj     = gl.getUniformLocation(this.prog, "u_LightViewProj");
    this.unifKernel     = gl.getUniformLocation(this.prog, "u_Kernel");

    this.unifCamPos     = gl.getUniformLocation(this.prog, "u_CamPos");

  }

  use() {
    if (activeProgram !== this.prog) {
      gl.useProgram(this.prog);
      activeProgram = this.prog;
    }
  }


static isPowerOf2(value : number) {
  return (value & (value - 1)) === 0;
}

makeTexture(src:string) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));
  // Asynchronously load an image
  var image = new Image();
  image.src = src;
  image.crossOrigin = "anonymous";

  console.log(image.src);
  image.addEventListener('load', function() {
    // Now that the image has loaded make copy it to the texture.
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);

    // Check if the image is a power of 2 in both dimensions.
    if (ShaderProgram.isPowerOf2(image.width) && ShaderProgram.isPowerOf2(image.height)) {
       // Yes, it's a power of 2. Generate mips.
       gl.generateMipmap(gl.TEXTURE_2D);
    } else {
       // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
       gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  });

  return texture;
}


createTexture() {
  this.use();
  // setting up texture in OpenGL

  let texture = this.makeTexture("./textures/textures.png");
  this.texture = texture;
  
  gl.uniform1i(this.unifTexture, 0);

}

createBump() {
  this.use();
  // setting up texture in OpenGL

  this.bump = this.makeTexture("./textures/normal_map.png");
  
  gl.uniform1i(this.unifBump, 1);

}

makeLightViewProj() {
  let depthFramebuffer = gl.createFramebuffer();
  //gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

  let lightPos = vec3.fromValues(5, 5, 0);
  let projWidth = 8.5;
  let projHeight = 8.5;

  this.shadowMap = gl.createTexture() 
  let lightView = mat4.create()
  mat4.lookAt(lightView,lightPos,vec3.create(), vec3.fromValues(0,1,0))
  let lightProj = mat4.create()
  lightProj = mat4.ortho(lightProj,-projWidth * 0.5,projWidth * 0.5,
    -projHeight * 0.5,projHeight * 0.5,0.1,10)
  let lightViewProj = mat4.create()
  mat4.multiply(lightViewProj, lightProj, lightView)
  this.setLightViewProjMatrix(lightViewProj)
  
}


setKernelMatrix(kernel : mat3) {
  this.use()
  if(this.unifKernel !== -1) {
    gl.uniformMatrix3fv(this.unifKernel, false, kernel);
  }

}

  setModelMatrix(model: mat4) {
    this.use();
    if (this.unifModel !== -1) {
      gl.uniformMatrix4fv(this.unifModel, false, model);
    }

    if (this.unifModelInvTr !== -1) {
      let modelinvtr: mat4 = mat4.create();
      mat4.transpose(modelinvtr, model);
      mat4.invert(modelinvtr, modelinvtr);
      gl.uniformMatrix4fv(this.unifModelInvTr, false, modelinvtr);
    }
  }

  setLightViewProjMatrix(mat : mat4) {
    this.use()
    if(this.unifLightViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifLightViewProj, false, mat);
    }
  }

  setCamPos(pos:vec3) {
    this.use();
    if(this.unifCamPos !== -1) {
      gl.uniform3fv(this.unifCamPos, pos);
    }
  }

  setTime(time:number) {
    this.use();
    if(this.unifTime !== -1) {
      gl.uniform1f(this.unifTime, time);
    }
  }

  setViewProjMatrix(vp: mat4) {
    this.use();
    if (this.unifViewProj !== -1) {
      gl.uniformMatrix4fv(this.unifViewProj, false, vp);
    }
  }

  setGeometryColor(color: vec4) {
    this.use();
    if (this.unifColor !== -1) {
      gl.uniform4fv(this.unifColor, color);
    }
  }

  draw(d: Drawable) {
    this.use();

    if (this.attrPos != -1 && d.bindPos()) {
      gl.enableVertexAttribArray(this.attrPos);
      gl.vertexAttribPointer(this.attrPos, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrNor != -1 && d.bindNor()) {
      gl.enableVertexAttribArray(this.attrNor);
      gl.vertexAttribPointer(this.attrNor, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrCol != -1 && d.bindCol()) {
      gl.enableVertexAttribArray(this.attrCol);
      gl.vertexAttribPointer(this.attrCol, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrUV != -1 && d.bindUV()) {
      gl.enableVertexAttribArray(this.attrUV);
      gl.vertexAttribPointer(this.attrUV, 2, gl.FLOAT, false, 0, 0);
    }

    if (this.attrTan != -1 && d.bindTan()) {
      gl.enableVertexAttribArray(this.attrTan);
      gl.vertexAttribPointer(this.attrTan, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.attrBit != -1 && d.bindBit()) {
      gl.enableVertexAttribArray(this.attrBit);
      gl.vertexAttribPointer(this.attrBit, 4, gl.FLOAT, false, 0, 0);
    }

    if (this.unifTexture != -1) {
      gl.activeTexture(gl.TEXTURE0); //GL supports up to 32 different active textures at once(0 - 31)
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.unifTexture, 0);
    }

    if (this.unifBump != -1) {
      gl.activeTexture(gl.TEXTURE1); //GL supports up to 32 different active textures at once(0 - 31)
      gl.bindTexture(gl.TEXTURE_2D, this.bump);
      gl.uniform1i(this.unifBump, 1);
    }

    if (this.unifShadowMap != -1) {
      //gl.activeTexture(gl.TEXTURE2); //GL supports up to 32 different active textures at once(0 - 31)
      //gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
      gl.uniform1i(this.unifShadowMap, 2);
    }


   // console.log("unifbump "+ this.unifBump)
    //console.log("unifTexture "+ this.unifTexture)


    d.bindIdx();
    gl.drawElements(d.drawMode(), d.elemCount(), gl.UNSIGNED_INT, 0);

    if (this.attrPos != -1) gl.disableVertexAttribArray(this.attrPos);
    if (this.attrNor != -1) gl.disableVertexAttribArray(this.attrNor);
    if (this.attrCol != -1) gl.disableVertexAttribArray(this.attrCol);
    if (this.attrUV != -1) gl.disableVertexAttribArray(this.attrUV);
    if (this.attrTan != -1) gl.disableVertexAttribArray(this.attrTan);
    if (this.attrBit != -1) gl.disableVertexAttribArray(this.attrBit);

  }
};

export default ShaderProgram;
