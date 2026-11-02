// The page-warp shader. Mode 0 twists an image of the current page into the
// centre, uncovering real deep space behind it. Modes 1 and 2 cut through that
// space to reveal the live new page, using a real marbled-paper scan as the
// edge: ink for paper, a burn for the Alchemist.

import { compile, FIELD_GLSL, VERT } from "./sky";

const FRAG = `
precision highp float;
varying vec2 uv;
uniform sampler2D uPage;
uniform sampler2D uMask;
uniform float uFly;
uniform float uDim;
uniform float uSpeed;
uniform float uScreen;
${FIELD_GLSL}
uniform float uP;
uniform float uMode;
uniform float uJolt;
uniform float uAspect;

vec2 twist(vec2 st, float p) {
  vec2 d = st - 0.5;
  d.x *= uAspect;
  float r = length(d);
  float a = atan(d.y, d.x);
  float q = p * p;
  a += q * 7.0 * (1.0 - smoothstep(0.0, 1.1, r)) + q * p * 3.0;
  r *= 1.0 + q * p * 9.0;
  vec2 o = vec2(cos(a), sin(a)) * r;
  o.x /= uAspect;
  return o + 0.5;
}

float inside(vec2 st) {
  vec2 e = smoothstep(vec2(0.0), vec2(0.002), st) * smoothstep(vec2(0.0), vec2(0.002), 1.0 - st);
  return e.x * e.y;
}

// Moving forward through the field: samples smear outward from the centre with speed.
vec3 space() {
  vec2 d = (uv - 0.5) * vec2(uAspect, 1.0) / max(uAspect, 1.0);
  vec3 c = vec3(0.0);
  for (float i = 0.0; i < 10.0; i += 1.0) {
    c += fieldAt(d / (1.0 + uSpeed * 0.34 * i / 10.0), uFly);
  }
  return c * 0.1 * uDim;
}

void main() {
  if (uMode < 0.5) {
    vec2 s = twist(uv, uP);
    vec2 off = vec2(uJolt * 0.018, 0.0);
    vec3 c = vec3(
      texture2D(uPage, s + off).r,
      texture2D(uPage, s).g,
      texture2D(uPage, s - off).b
    );
    float keep = inside(s) * (1.0 - smoothstep(0.8, 1.0, uP));
    // The real site is light on black, so its picture is screened over space, not pasted.
    c = uScreen > 0.5 ? 1.0 - (1.0 - space()) * (1.0 - c * keep) : mix(space(), c, keep);
    c *= 1.0 - uJolt * 0.35 * step(0.5, fract(uP * 37.0));
    gl_FragColor = vec4(c, 1.0);
    return;
  }

  vec2 d = uv - 0.5;
  d.x *= uAspect;
  float n = texture2D(uMask, uv * vec2(uAspect, 1.0) * 0.9).r;
  float field = 0.5 * length(d) * 1.35 + 0.5 * n;
  float t = uP * 1.2 - 0.1;
  float cover = smoothstep(t - 0.018, t + 0.018, field);
  float edge = smoothstep(t - 0.09, t, field) * (1.0 - smoothstep(t, t + 0.05, field));

  vec3 sky = space();
  vec3 col;
  float alpha;
  if (uMode < 1.5) {
    col = mix(vec3(0.14, 0.09, 0.05), sky, cover);
    alpha = max(cover, edge * 0.65);
  } else {
    col = mix(vec3(1.0, 0.36, 0.05) * 1.5, sky, cover);
    alpha = max(cover, edge);
  }
  gl_FragColor = vec4(col * alpha, alpha);
}`;

export interface Warp {
  setPage(source: TexImageSource, screen: boolean): void;
  draw(mode: number, p: number, jolt: number, fly: number, speed: number, dim: number): void;
  resize(): void;
}

function texture(gl: WebGLRenderingContext, unit: number, wrap: number) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

export function createWarp(canvas: HTMLCanvasElement, mask: TexImageSource, field: TexImageSource): Warp | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uP = u("uP");
  const uMode = u("uMode");
  const uJolt = u("uJolt");
  const uAspect = u("uAspect");
  gl.uniform1i(u("uPage"), 0);
  gl.uniform1i(u("uMask"), 1);
  gl.uniform1i(u("uSpace"), 2);
  const uFly = u("uFly");
  const uDim = u("uDim");
  const uSpeed = u("uSpeed");
  const uScreen = u("uScreen");

  // Both are power-of-two textures, which WebGL 1 requires for anything but clamping.
  texture(gl, 1, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask);
  texture(gl, 2, gl.MIRRORED_REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
  texture(gl, 0, gl.CLAMP_TO_EDGE);

  const warp: Warp = {
    setPage(source, screen) {
      gl.uniform1f(uScreen, screen ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },
    resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * scale);
      canvas.height = Math.round(window.innerHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, canvas.width / canvas.height);
    },
    draw(mode, p, jolt, fly, speed, dim) {
      gl.uniform1f(uFly, fly);
      gl.uniform1f(uDim, dim);
      gl.uniform1f(uSpeed, speed);
      gl.uniform1f(uMode, mode);
      gl.uniform1f(uP, p);
      gl.uniform1f(uJolt, jolt);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
  warp.resize();
  return warp;
}
