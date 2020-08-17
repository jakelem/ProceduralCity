#version 300 es

//This is a vertex shader. While it is called a "shader" due to outdated conventions, this file
//is used to apply matrix transformations to the arrays of vertex data passed to it.
//Since this code is run on your GPU, each vertex is transformed simultaneously.
//If it were run on your CPU, each vertex would have to be processed in a FOR loop, one at a time.
//This simultaneous transformation allows your program to run much faster, especially when rendering
//geometry with millions of vertices.

uniform mat4 u_Model;       // The matrix that defines the transformation of the
                            // object we're rendering. In this assignment,
                            // this will be the result of traversing your scene graph.

uniform mat4 u_ModelInvTr;  // The inverse transpose of the model matrix.
                            // This allows us to transform the object's normals properly
                            // if the object has been non-uniformly scaled.

uniform mat4 u_ViewProj;    // The matrix that defines the camera's transformation.
                            // We've written a static matrix for you to use for HW2,
                            // but in HW3 you'll have to generate one yourself

uniform mat4 u_LightViewProj;    


out vec4 fs_LightSpacePos;
in vec4 vs_Pos;             // The array of vertex positions passed to the shader

in vec4 vs_Nor;             // The array of vertex normals passed to the shader

in vec4 vs_Tan;             // The array of vertex positions passed to the shader
in vec4 vs_Bit;             // The array of vertex positions passed to the shader

in vec4 vs_Col;             // The array of vertex colors passed to the shader.
in vec2 vs_UV;             // The array of vertex colors passed to the shader.

out vec4 fs_Nor;            // The array of normals that has been transformed by u_ModelInvTr. This is implicitly passed to the fragment shader.
out vec4 fs_TanLightPos;
out vec4 fs_TanCamPos;
out vec4 fs_TanPos;

out vec4 fs_Pos;
out vec4 fs_LightPos;

out vec4 fs_Col;            // The color of each vertex. This is implicitly passed to the fragment shader.

out vec2 fs_UV;            // The color of each vertex. This is implicitly passed to the fragment shader.

uniform vec3 u_LightPos;
const vec4 lightPos = vec4(-20, 8, 0, 1); //The position of our virtual light, which is used to compute the shading of
                                        //the geometry in the fragment shader.
out mat3 fs_TBN;

out vec3 fs_Tan;
uniform vec3 u_CamPos;

out vec4 fs_Rd;
void main()
{
    fs_Col = vs_Col;                         // Pass the vertex colors to the fragment shader for interpolation
    fs_UV = vs_UV;
    mat3 invTranspose = mat3(u_ModelInvTr);
    fs_Nor = vec4(invTranspose * vec3(vs_Nor), 0);          // Pass the vertex normals to the fragment shader for interpolation.
                                                            // Transform the geometry's normals by the inverse transpose of the
                                                            // model matrix. This is necessary to ensure the normals remain
                                                            // perpendicular to the surface after the surface is transformed by
                                                            // the model matrix.


    vec4 modelposition = u_Model * vs_Pos;   // Temporarily store the transformed vertex positions for use below
    fs_Pos = modelposition;
    vec4 light4 = vec4(u_LightPos,1.0);
    fs_LightPos = light4;

fs_LightSpacePos = u_LightViewProj * modelposition;
fs_LightSpacePos = fs_LightSpacePos * 0.5 + 0.5;
    //fs_LightVec = lightPos;  // Compute the direction in which the light source lies

    gl_Position = u_ViewProj * modelposition;// gl_Position is a built-in variable of OpenGL which is
                                             // used to render the final positions of the geometry's vertices
vec3 T = normalize(vec3(u_Model * vs_Tan));
vec3 N = normalize(vec3(u_Model * vs_Nor));
vec3 B = normalize(cross(N, T));

mat3 TBN = mat3(T.xyz,B.xyz, N.xyz);
mat3 invTBN = transpose(TBN);
fs_Tan = T;


fs_TanLightPos = vec4(invTBN  * vec3(light4), 1);
fs_TanCamPos = vec4(invTBN  * vec3(u_CamPos), 1);
fs_TanPos = vec4(invTBN  * vec3(modelposition), 1);

    //vec3 rd = normalize(vs_Pos.xyz - u_CamPos);
//fs_Rd = vec4(invTBN  * rd, 1);

}
