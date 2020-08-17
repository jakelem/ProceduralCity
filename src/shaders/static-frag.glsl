#version 300 es

// This is a fragment shader. If you've opened this file first, please
// open and read lambert.vert.glsl before reading on.
// Unlike the vertex shader, the fragment shader actually does compute
// the shading of geometry. For every pixel in your program's output
// screen, the fragment shader is run for every bit of geometry that
// particular pixel overlaps. By implicitly interpolating the position
// data passed into the fragment shader by the vertex shader, the fragment shader
// can compute what color to apply to its pixel based on things like vertex
// position, light position, and vertex color.
precision highp float;

uniform vec4 u_Color; // The color with which to render this instance of geometry.

// These are the interpolated values out of the rasterizer, so you can't know
// their specific values without knowing the vertices that contributed to them
in vec4 fs_Nor;
in vec4 fs_LightVec;
in vec4 fs_Col;
in vec4 fs_Pos;
uniform mat4 u_ViewProj;    

in vec2 fs_UV;
uniform samplerCube u_SkyBox;
uniform vec3 u_CamPos;
uniform sampler2D u_ShadowMap;
uniform sampler2D u_Texture;

uniform float u_Time;

const vec3 sky[5] = vec3[](
vec3(142, 199, 230) / 255.0,

vec3(142, 199, 230) / 255.0,

vec3(142, 199, 230) / 255.0,

vec3(195, 232, 213) / 255.0,
vec3(142, 199, 230) / 255.0);

const vec3 bluegreen[5] = vec3[](
    vec3(115, 120, 176) / 255.0, 
    vec3(142, 120, 184) / 255.0, 

vec3(142, 120, 184) / 255.0,
vec3(252, 144, 168) / 255.0,
vec3(255, 182, 192) / 255.0
);


const vec3 sunset[5] = vec3[](
vec3(142, 199, 230) / 255.0,

vec3(142, 199, 230) / 255.0,

vec3(142, 199, 230) / 255.0,

vec3(142, 199, 230) / 255.0,
vec3(142, 219, 250) / 255.0);


const float cutoffs[5] = float[](0.15,0.3,0.4,0.65,0.75);

vec3 uvToSunset(vec2 uv) {
    if(uv.y < cutoffs[0]) {
        return sunset[0];
    }
    else if(uv.y < cutoffs[1]) {
        return mix(sunset[0], sunset[1], (uv.y - cutoffs[0]) / (cutoffs[1] - cutoffs[0]));
    }
    else if(uv.y < cutoffs[2]) {
        return mix(sunset[1], sunset[2], (uv.y - cutoffs[1]) / (cutoffs[2] - cutoffs[1]));
    }
    else if(uv.y < cutoffs[3]) {
        return mix(sunset[2], sunset[3], (uv.y - cutoffs[2]) / (cutoffs[3] - cutoffs[2]));
    }
    else if(uv.y < cutoffs[4]) {
        return mix(sunset[3], sunset[4], (uv.y - cutoffs[3]) / (cutoffs[4] - cutoffs[3]));
    }
    return sunset[4];
}


out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

void main()
{
    // Material base color (before shading)
        vec4 diffuseColor = fs_Col;
         //diffuseColor = vec4(0.1,1,1,1);
        vec2 uv = 0.5 * (fs_Pos.xy + vec2(1,1));

        // Calculate the diffuse term for Lambert shading
        float diffuseTerm = dot(normalize(fs_Nor), normalize(fs_LightVec));
        // Avoid negative lighting values
        // diffuseTerm = clamp(diffuseTerm, 0, 1);

        float ambientTerm = 0.7;

        float lightIntensity = diffuseTerm + ambientTerm;   //Add a small float value to the color multiplier
                                                            //to simulate ambient lighting. This ensures that faces that are not
//                                                            //lit by our point light are not completely black.

        // Compute final shaded color
       // out_Col = vec4(0,0.8,0.5,1);
       out_Col = vec4(uvToSunset(uv),1);
	//out_Col = diffuseColor;

out_Col =  texture(u_ShadowMap, fs_UV);
vec2 ndc = (fs_Pos.xy + 1.0);
vec4 p = vec4(ndc, 1.0, 1.0) * 1000.0;
p = u_ViewProj * p;
vec3 dir = normalize(p.xyz - u_CamPos.xyz);
//out_Col =  texture(u_SkyBox, dir);
//out_Col = vec4((fs_Pos + 1.0) * 0.5);
}
