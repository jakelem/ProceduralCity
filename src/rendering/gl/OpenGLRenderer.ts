import {mat4, vec4} from 'gl-matrix';
import Drawable from './Drawable';
import Camera from '../../Camera';
import {gl} from '../../globals';
import ShaderProgram from './ShaderProgram';

// In this file, `gl` is accessible because it is imported above
class OpenGLRenderer {
  constructor(public canvas: HTMLCanvasElement) {
  }

  setClearColor(r: number, g: number, b: number, a: number) {
    gl.clearColor(r, g, b, a);
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  renderShadow(prog: ShaderProgram, drawables: Array<Drawable>) {
    let frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    let shadowTexture = gl.createTexture()
    let texWidth = 2048;
    let texHeight = 2048;

    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texWidth, texHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


      // Create and bind the framebuffer

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, shadowTexture, 0);

    let renderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);

    // make a depth buffer and the same size as the targetTexture
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, texWidth, texHeight);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);

    //gl.bindTexture(gl.TEXTURE_2D, null)
    //gl.bindRenderbuffer(gl.RENDERBUFFER, null)
    let model = mat4.create();
    prog.setModelMatrix(model);

    prog.makeLightViewProj()

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    gl.viewport(0, 0, texWidth, texHeight);
    gl.clearColor(0.7,0.8,1.0,1.0)

    //gl.clearDepth(1.0)

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (let drawable of drawables) {
      prog.draw(drawable);
    }

    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, shadowTexture);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  }

  render(camera: Camera, prog: ShaderProgram, drawables: Array<Drawable>, inModel : mat4 = undefined, invertViewProj = false) {
    let model = mat4.create();
    let viewProj = mat4.create();
    let color = vec4.fromValues(1, 1, 0, 1);

    mat4.identity(model);

    if(inModel !== undefined) {
      model = inModel;
    }
    mat4.multiply(viewProj, camera.projectionMatrix, camera.viewMatrix);
    prog.setModelMatrix(model);
    if(invertViewProj) {
      mat4.invert(viewProj, viewProj)
    }

    prog.setViewProjMatrix(viewProj);

    prog.setGeometryColor(color);

    for (let drawable of drawables) {
      prog.draw(drawable);
    }
  }
};

export default OpenGLRenderer;
