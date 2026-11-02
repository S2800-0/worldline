// The real Hubble Ultra Deep Field, live behind the real site. Scrolling flies
// forward through it, and the pointer is an invisible mass that bends its light
// with the point-mass lens equation, so the Einstein ring you see is the real one.

import { fieldObjects, type FieldObject } from "../data/field";

export const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// Two copies of the field, each growing to double size and fading out as the
// other takes over, so the flight never runs out of image.
export const FIELD_GLSL = `
uniform sampler2D uSpace;
vec3 fieldAt(vec2 d, float fly) {
  vec3 c = vec3(0.0);
  for (float i = 0.0; i < 2.0; i += 1.0) {
    float ph = fract(fly + i * 0.5);
    float w = sin(3.14159265 * ph);
    vec2 q = d * 0.98 / pow(2.0, ph);
    if (i > 0.5) q = vec2(-q.y, q.x) + 0.01;
    c += w * w * texture2D(uSpace, 0.5 + q).rgb;
  }
  return c;
}`;

const FRAG = `
precision highp float;
varying vec2 uv;
uniform vec2 uLens;
uniform float uMass;
uniform float uFly;
uniform float uDim;
uniform float uAspect;
${FIELD_GLSL}
void main() {
  vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);
  vec2 v = p - uLens;
  vec2 source = p - uMass * uMass * v / (dot(v, v) + 0.0004);
  gl_FragColor = vec4(fieldAt(source / max(uAspect, 1.0), uFly) * uDim, 1.0);
}`;

export function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed");
  }
  return shader;
}

/** Shared with the warp, so a trip leaves from and lands at the same place in the field. */
export const flight = { fly: 0, dim: 1, kick: 0, held: false };

const FLY_PX = 2200;
const REST_DIM = 0.36;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Where a place in the image is on screen right now, for each copy of the field that's showing. */
function nearestObject(lx: number, ly: number, aspect: number, reach: number) {
  let best: FieldObject | null = null;
  let bestDistance = reach;
  for (const object of fieldObjects) {
    for (let i = 0; i < 2; i++) {
      const ph = ((flight.fly + i * 0.5) % 1 + 1) % 1;
      if (Math.sin(Math.PI * ph) ** 2 < 0.35) continue;
      const qx = object.u - 0.5;
      const qy = object.v - 0.5;
      const [ax, ay] = i === 0 ? [qx, qy] : [qy - 0.01, -(qx - 0.01)];
      const grow = (2 ** ph / 0.98) * Math.max(aspect, 1);
      const distance = Math.hypot(ax * grow - lx, ay * grow - ly);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = object;
      }
    }
  }
  return best;
}

export function startSky(
  canvas: HTMLCanvasElement,
  field: TexImageSource,
  onSight: (object: FieldObject | null, x: number, y: number) => void,
) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
  if (!gl) return () => {};

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return () => {};
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uLens = u("uLens");
  const uMass = u("uMass");
  const uFly = u("uFly");
  const uDim = u("uDim");
  const uAspect = u("uAspect");

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, field);
  // Without mipmaps, the light squeezed next to the mass shimmers into rings.
  gl.generateMipmap(gl.TEXTURE_2D);

  let aspect = 1;
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * scale);
    canvas.height = Math.round(canvas.clientHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    aspect = canvas.width / canvas.height;
    gl.uniform1f(uAspect, aspect);
  };
  resize();
  window.addEventListener("resize", resize);

  // With no pointer to follow, the mass wanders on its own.
  let pointer: [number, number] | null = null;
  let pressed = false;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || e.isPrimary) {
      pointer = [(e.clientX / innerWidth - 0.5) * aspect, e.clientY / innerHeight - 0.5];
    }
  };
  const onDown = () => (pressed = true);
  const onUp = () => (pressed = false);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("pointerup", onUp, { passive: true });

  let lx = 0.12 * aspect;
  let ly = -0.14;
  let mass = 0;
  let scroll = scrollY;
  let anchor = flight.fly - scroll / FLY_PX;
  let raf = 0;
  let last = performance.now();

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const ease = (rate: number) => 1 - Math.exp(-rate * dt);

    const wander: [number, number] = [
      Math.sin(now / 4300) * 0.32 * aspect,
      Math.sin(now / 3100 + 1) * 0.26,
    ];
    const [tx, ty] = pointer ?? wander;
    lx += (tx - lx) * ease(pointer ? 6 : 1.2);
    ly += (ty - ly) * ease(pointer ? 6 : 1.2);
    const size = Math.min(aspect, 1);
    mass += ((pressed ? 0.22 : 0.13) * size - mass) * ease(5);

    scroll += (scrollY - scroll) * ease(7);
    if (flight.held) {
      anchor = flight.fly - scroll / FLY_PX;
    } else {
      anchor += dt * 0.006;
      flight.kick *= 1 - ease(3.2);
      flight.fly = anchor + scroll / FLY_PX - flight.kick;
      const target = 1 + (REST_DIM - 1) * smoothstep(0.1, 0.7, scrollY / innerHeight);
      flight.dim += (target - flight.dim) * ease(5);
    }

    // Only for someone actually exploring, so a wandering note can't sit on the explanation.
    const looking = pointer && !flight.held && flight.kick < 0.05 && flight.dim > 0.6;
    onSight(
      looking ? nearestObject(lx, ly, aspect, Math.max(mass * 0.9, 0.05)) : null,
      (lx / aspect + 0.5) * innerWidth,
      (ly + 0.5) * innerHeight,
    );

    gl.uniform2f(uLens, lx, ly);
    gl.uniform1f(uMass, mass);
    gl.uniform1f(uFly, flight.fly);
    gl.uniform1f(uDim, flight.dim);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
