import {vec2, vec3, vec4, mat4, quat} from 'gl-matrix';


class Utils {

    //returns axis-angle representation of a rotation to the xz plane
    static rotateToXZPlane(v : vec3) {
        let rot_vec = vec3.create()
        vec3.cross(rot_vec, v, vec3.fromValues(0,1,0))
        vec3.normalize(rot_vec, rot_vec)
        let l = vec3.length(rot_vec)
        
        let angle = -vec3.angle(v, vec3.fromValues(0,1,0))
        return Utils.vec3ToVec4(rot_vec,angle)
    } 

    static bilinearInterp(p1 : vec3, p2: vec3, p3: vec3, p4: vec3) {
        let midpt = vec3.create()
        vec3.lerp(midpt, p1, p2, 0.5)
  
        let m2 = vec3.create()
        vec3.lerp(m2, p3, p4, 0.5)
        vec3.lerp(midpt, midpt, m2, 0.5)
        return midpt
    }

    static xyz(v:any) {
        return vec3.fromValues(v[0], v[1], v[2])
    }

    static vec3toVec4(v : vec3, w : number) {
        return vec4.fromValues(v[0],v[1],v[2],w)
    }
    static eulerXYZDegrees(rotate:vec3) {
        let transform = mat4.create() 
        mat4.rotateX(transform, transform, rotate[0] * Math.PI / 180);
        mat4.rotateY(transform, transform, rotate[1] * Math.PI / 180);
        mat4.rotateZ(transform, transform, rotate[2] * Math.PI / 180);
        return transform
    }
    static calcNormal(p1 : vec3, p2 : vec3, p3 : vec3) {
        let e1 = vec3.create()
        vec3.subtract(e1, p2, p1)
        vec3.normalize(e1,e1)
        let e2 = vec3.create()
        vec3.subtract(e2, p3, p2)
        vec3.normalize(e2,e2)

        let norm = vec3.create()
        vec3.cross(norm, e1, e2)
        vec3.normalize(norm, norm)
        return norm
    }

    static directionBetween(p1: vec3, p2:vec3) {
        let edge = vec3.create()
        vec3.subtract(edge, p1, p2)
        vec3.normalize(edge, edge)
        return edge
  
    }

    static eulerXYZRadians(rotate:vec3) {
        let transform = mat4.create() 
        mat4.rotateX(transform, transform, rotate[0]);
        mat4.rotateY(transform, transform, rotate[1]);
        mat4.rotateZ(transform, transform, rotate[2]);
        return transform
    }

    static copyVec3(v : vec3) {
        let res = vec3.create()
        vec3.copy(res, v)
        return res
    }
    static xz(v: any) {
        return vec2.fromValues(v[0], v[2])
    }

    static vec3ToVec4(v: vec3, w : number) {
        return vec4.fromValues(v[0],v[1], v[2],w)
    }


    static crossVec2(v : vec2, w : vec2) {
        return v[0] * w[1] - v[1] * w[0]
    }

    static radiansToDegrees(rad : number) {
        return rad * 180 / Math.PI;
    }
    static randomColor() {
        let r = Math.random();
        let g = Math.random();
        let b = Math.random();
        return vec4.fromValues(r, g, b, 1);
    }

    static count = 0;
    static seeds = [0.0,0.4,0.1,0.2, 1.0, 0.9, 0.942,0.1943,0.14578,0.9876,0.56,0.1837,0.34,0.23]
    //static seeds = [0.2, 0.3, 0.0,0.4,0.1,0.2, 1.0, 0.9, 0.942,0.1943,0.14578,0.9876,0.56,0.1837,0.34,0.23]
    //wrapper so that if we want a deterministic generation, can replace math.random() with deterministic value
    static random() {
        return Math.random()
        
        Utils.count++;
        return Utils.seeds[(Utils.count+ 2) % Utils.seeds.length];
    }

    static randomIntRange(min : number, max : number) {
        return Math.floor(Utils.randomFloatRange(min, max));
    }

    static randomFloatRange(min : number, max : number) {
        let diff = Math.abs(max - min);
        return min + Utils.random() * diff;
    }

    static clamp(p : number, min : number, max : number) {
        return Math.min(Math.max(p, min), max);
    }
    static abs3 (p : vec3) {
        return vec3.fromValues(Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]));
    }

    static fract(p : number) {
        return Math.abs(p) - Math.abs(Math.floor(p));
    }

    static fract2 (p: vec2) {
        return vec2.fromValues(Utils.fract(p[0]), Utils.fract(p[1]));
    }

    static sin2 (p: vec2) {
        return vec2.fromValues(Math.sin(p[0]), Math.sin(p[1]));
    }


    static fract3 (p: vec3) {
        return vec3.fromValues(Utils.fract(p[0]), Utils.fract(p[1]), Utils.fract(p[2]));
    }

    static floor2 (p: vec2) {
        return vec2.fromValues(Math.floor(p[0]), Math.floor(p[1]));
    }

    static floor3 (p: vec3) {
        return vec3.fromValues(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2]));
    }


    static sin3 (p: vec3) {
        return vec3.fromValues(Math.sin(p[0]), Math.sin(p[1]), Math.sin(p[2]));
    }

    static hash2 (p: vec2) {
        let p1 = vec2.fromValues(vec2.dot(p, vec2.fromValues(127.1, 311.7)),
        vec2.dot(p, vec2.fromValues(269.5, 183.3)));
        vec2.scale(p1,p1, 43758.5453);

        return Utils.fract2(Utils.sin2(p1));
    }


    static hash3 (p: vec3) {
        let p1 = vec3.fromValues(vec3.dot(p, vec3.fromValues(127.1, 311.7, 841.3)),
        vec3.dot(p, vec3.fromValues(269.5, 183.3, 417.2)),
        vec3.dot(p, vec3.fromValues(564.7, 299.1, 603.6)));
        vec3.scale(p1,p1, 43758.5453);

        return Utils.fract3(Utils.sin3(p1));
    }

    static cubic2(t: vec2) {
        let res = vec2.create();
        vec2.multiply(res,t,t);
        vec2.scaleAndAdd(res, vec2.fromValues(3,3), t, -2.0);
        vec2.multiply(res,res,t);
        vec2.multiply(res,res,t);

        return res;
    }

    static cubic3(t: vec3) {
        let res = vec3.create();
        vec3.multiply(res,t,t);
        vec3.scaleAndAdd(res, vec3.fromValues(3,3,3), t, -2.0);
        vec3.multiply(res,res,t);
        vec3.multiply(res,res,t);

        return res;
        //t * t * (3.0 - 2.0 * t);
    }

    static cosineInterp(p1 : number, p2:number, mu : number){
      let m2 = (1-Math.cos(mu * Math.PI)) * 0.5
      return (p1 * (1-m2) + p2 * m2)
    }

    static cosineInterp3(p1 : vec3, p2:vec3, mu : number){
        return vec3.fromValues(Utils.cosineInterp(p1[0],p2[0], mu),
        Utils.cosineInterp(p1[1],p2[1], mu),
        Utils.cosineInterp(p1[2],p2[2], mu))
      }


    static scaleAboutAnchor(p : vec3, anchor : vec3, scale: vec3) {
        let invAnchor = vec3.create()
        vec3.scale(invAnchor, anchor, -1)
        let s = mat4.create()
    
        mat4.translate(s,s,anchor)
        mat4.scale(s,s,scale)
        mat4.translate(s,s,invAnchor)
    
        vec3.transformMat4(p,p,s)
    }


    static surflet(p : vec2,  gridPoint : vec2) {
        let gp = vec2.create();
        vec2.subtract(gp, p, gridPoint);
        gp = vec2.fromValues(Math.abs(gp[0]), Math.abs(gp[1]));
        let t = vec2.create();
        vec2.subtract(t, vec2.fromValues(1,1), Utils.cubic2(gp));
        let gradient = vec2.create();
        vec2.scaleAndAdd(gradient, vec2.fromValues(-1,-1),Utils.hash2(gridPoint), 2);

        let diff = vec2.create();
        vec2.subtract(diff, p, gridPoint);

        let height = vec2.dot(diff, gradient);
        return height * t[0] * t[1];
    
    }

    static quatToEuler(q : quat) {
        let h = Math.atan2(2* q[1] * q[3] - 2 * q[0] * q[2], 1 - 2 * q[1] * q[1] - 2 * q[2] * q[2])
        let a = Math.asin(2 * q[0] * q[1] + 2 * q[2] * q[3])
        let b = Math.atan2(2 * q[0] * q[3] - 2 * q[1] * q[2], 1 - 2 * q[0] * q[0] - 2 * q[2] * q[2])

        let s = q[0] + q[1] + q[2] * q[3]
        if(s == 0.5) {
            h = 2 * Math.atan2(q[0],q[3])
            b = 0
        } else if(s == -0.5) {
            h = -2 * Math.atan2(q[0],q[3])

            b = 0
        }
        return vec3.fromValues(b,h,a)
    }

    static surflet3(p: vec3, gridPoint : vec3) {
        let gp = vec3.create();
        vec3.subtract(gp, p, gridPoint);
        gp = vec3.fromValues(Math.abs(gp[0]), Math.abs(gp[1]), Math.abs(gp[2]))
        let t = vec3.create();
        vec3.subtract(t, vec3.fromValues(1,1,1), Utils.cubic3(gp));

        let gradient = vec3.create();
        vec3.scaleAndAdd(gradient, vec3.fromValues(-1,-1,-1),Utils.hash3(gridPoint), 2);

        let diff = vec3.create();
        vec3.subtract(diff, p, gridPoint);

        let height = vec3.dot(diff, gradient);
        return height * t[0] * t[1] * t[2];
    }
    
    static perlin3(p : vec3, v: number) {
        let f = Utils.floor3(p);
        let res = 0.0;
        for(let i = 0; i <= 1; i++) {
            for(let j = 0; j <= 1; j++) {
                for(let k = 0; k <= 1; k++) {
                    let inp = vec3.create();
                    vec3.add(inp, f, vec3.fromValues(i,j,k))
                    res += Utils.surflet3(p, inp);
                }
            }
        }
        return res;
    }


    static perlin(p: vec2) {
        let f = Utils.floor2(p);
        let res = 0.0;
        for(let i = 0; i <= 1; i++) {
            for(let j = 0; j <= 1; j++) {
                let gp = vec2.create();
                vec2.add(gp, f, vec2.fromValues(i,j))
                res += Utils.surflet(p, gp);
            }
        }
        return res;

    }
};

export default Utils;
