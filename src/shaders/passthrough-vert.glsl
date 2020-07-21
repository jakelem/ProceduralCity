#version 150
// passthrough.vert.glsl:
// A vertex shader that simply passes along vertex data
// to the fragment shader without operating on it in any way.

in vec4 vs_Pos;
in vec2 vs_UV;
uniform mat4 u_Model;
uniform mat4 u_View;        // The matrix that defines the camera's transformation.
uniform mat4 u_Proj;        // The matrix that defines the camera's projection.

out vec2 fs_UV;

void main()
{
    fs_UV = vs_UV;
    gl_Position = vs_Pos;
}
