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
in vec4 fs_TanCamPos;
in vec4 fs_TanLightPos;
in vec4 fs_TanPos;
in vec4 fs_LightSpacePos;

in vec4 fs_Col;
in vec2 fs_UV;
in mat3 fs_TBN;
in vec3 fs_Tan;
in vec4 fs_LightPos;
in vec4 fs_Pos;
uniform vec3 u_CamPos;
uniform samplerCube u_SkyBox;
uniform sampler2D u_ShadowMap;

uniform sampler2D u_Texture;
uniform sampler2D u_NormalMap;
const float texSize = 1.0 / 2048.0;
in vec4 fs_Rd;
out vec4 out_Col; // This is the final output color that you will see on your
                  // screen for the pixel that is currently being processed.

vec2 hash (vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}


float inShadow(vec2 texUV) {
        float shadow_dist = texture(u_ShadowMap, texUV).x;
        if(fs_LightSpacePos.z < shadow_dist + 0.006) {
		return 1.0;
	} else {
                return 0.0;
        }

}
float lerpShadow(vec2 texUV) {      
    float a = inShadow(texUV + texSize * vec2(0, 0));
        float b = inShadow(texUV + texSize * vec2(0, 1));
    float c = inShadow(texUV + texSize * vec2(1, 0));
    float d = inShadow(texUV + texSize * vec2(1, 1));

float ab = mix(a, b, 0.5);
float cd = mix(c, d, 0.5);
return mix(ab, cd, 0.5);

}
void main()
{
    // Material base color (before shading)
        vec4 diffuseColor = texture(u_Texture, fs_UV);

    	vec4 normSample = texture(u_NormalMap, fs_UV);
        vec3 norm = vec3(normSample);
        float spec = normSample.a;
spec = clamp(spec-0.1,0.0,1.0);

        vec3 tanLightVec = normalize(fs_TanLightPos.xyz - fs_TanPos.xyz);
                vec3 tanViewVec = normalize(fs_TanPos.xyz - fs_TanCamPos.xyz);

        vec3 h = (tanLightVec - tanViewVec);


	norm = normalize(norm * 2.0 - 1.0);

        if(diffuseColor.a < 0.1)
            discard;


        // Calculate the diffuse term for Lambert shading
        float diffuseTerm = dot(norm.xyz, normalize(tanLightVec));


	vec4 cubeSample = texture(u_SkyBox, h.xyz);
       

	diffuseTerm = max(diffuseTerm,0.0);

	float specularIntensity = spec * 0.2* max(pow(clamp(dot(h, norm.xyz), 0.0, 1.0), 12.0), 0.0);


        float avg = 0.0;
        float count = 0.0;
	for(int i = -2; i <= 2; i++) {
        for(int j = -2; j <= 2; j++) {
        vec2 rand = hash(fs_UV);
           avg += inShadow(fs_LightSpacePos.xy + texSize * (vec2(i, j) + rand));
	
        count++;
	}	
	}

        avg /= count;	

	//avg = lerpShadow(fs_LightSpacePos.xy);
        float lightIntensity = (diffuseTerm * 1.5 + specularIntensity) * avg;
	diffuseColor = mix(diffuseColor, cubeSample, clamp(spec * 0.7, 0.0,1.0));


        float test = dot(fs_Nor.xyz, fs_Tan.xyz);
        out_Col = vec4(diffuseColor.rgb * lightIntensity,1.0);

        float ambientTerm = clamp(0.6 - lightIntensity, 0.0, 1.0);
        out_Col +=  ambientTerm * vec4(0.6,0.8,0.9, 0.0) * vec4(diffuseColor.rgb,0.0);
        float dist = clamp(length(vec3(fs_Pos) - u_CamPos) * 0.03 - 1.5, 0.0, 1.0);
        out_Col = mix(out_Col, vec4(0.7,0.8,1.0,1.0), dist);
        //out_Col = vec4(dist, dist, dist, 1);
}
