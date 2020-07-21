#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform mat4 u_Model;
uniform mat4 u_LightViewProj;    
in vec4 vs_Pos;             
in vec4 vs_UV;             
out vec2 fs_UV;
void main()
{                                                            // the model matrix.


    gl_Position = u_LightViewProj * u_Model * vs_Pos;// gl_Position is a built-in variable of OpenGL which is


}
