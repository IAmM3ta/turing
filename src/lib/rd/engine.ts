import { foldIndex, seedMode, type FoldId, type SeedStyle } from "@/lib/rd/presets";

export const SIM_SIZE = 288;

const VERT = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 verts[3] = vec2[3](vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  vec2 p = verts[gl_VertexID];
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}
`;

const SIM = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uFeed;
uniform float uKill;
uniform float uDelta;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 t = uTexel;
  vec2 c = texture(uState, vUv).rg;
  vec2 n = texture(uState, vUv + vec2(0.0, t.y)).rg;
  vec2 s = texture(uState, vUv + vec2(0.0, -t.y)).rg;
  vec2 e = texture(uState, vUv + vec2(t.x, 0.0)).rg;
  vec2 w = texture(uState, vUv + vec2(-t.x, 0.0)).rg;
  vec2 lap = n + s + e + w - 4.0 * c;
  float A = c.r;
  float B = c.g;
  float react = A * B * B;
  float du = 0.2097 * lap.r - react + uFeed * (1.0 - A);
  float dv = 0.105 * lap.g + react - (uFeed + uKill) * B;
  vec2 dst = clamp(c + uDelta * vec2(du, dv), 0.0, 1.0);
  fragColor = vec4(dst, 0.0, 1.0);
}
`;

const FOLD = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform int uFold;
in vec2 vUv;
out vec4 fragColor;
const float TAU = 6.28318530718;
const float PI = 3.14159265359;

bool inDomain(vec2 uv) {
  if (uFold == 1) return uv.x >= 0.5;
  if (uFold == 2) return uv.y >= 0.5;
  if (uFold == 3) return uv.x >= 0.5 && uv.y >= 0.5;
  vec2 p = uv * 2.0 - 1.0;
  if (dot(p, p) < 1e-8) return true;
  float ang = mod(atan(p.y, p.x) + TAU, TAU);
  float n = uFold == 4 ? 3.0 : uFold == 5 ? 6.0 : 8.0;
  return ang <= (PI / n) + 0.0015;
}

vec2 foldUv(vec2 uv) {
  if (uFold == 1) return vec2(max(uv.x, 1.0 - uv.x), uv.y);
  if (uFold == 2) return vec2(uv.x, max(uv.y, 1.0 - uv.y));
  if (uFold == 3) return vec2(max(uv.x, 1.0 - uv.x), max(uv.y, 1.0 - uv.y));
  float n = uFold == 4 ? 3.0 : uFold == 5 ? 6.0 : 8.0;
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p);
  float ang = mod(atan(p.y, p.x) + TAU, TAU);
  float wedge = PI / n;
  float m = mod(ang, wedge * 2.0);
  if (m > wedge) m = wedge * 2.0 - m;
  vec2 q = vec2(cos(m), sin(m)) * r;
  return clamp(q * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
  vec2 uv = inDomain(vUv) ? vUv : foldUv(vUv);
  fragColor = texture(uState, uv);
}
`;

const SEED = `#version 300 es
precision highp float;
uniform float uMode;
uniform float uSeed;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  if (uMode < -0.5) {
    fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 p = vUv - 0.5;
  float A = 1.0;
  float B = 0.0;
  float n = hash(vUv * 37.0 + uSeed);
  if (uMode < 0.5) {
    if (length(p) < 0.045) { A = 0.5; B = 1.0; }
  } else if (uMode < 1.5) {
    float m = min(min(length(p), length(p - vec2(0.16, 0.05))),
      min(length(p - vec2(-0.12, 0.14)), min(length(p - vec2(0.02, -0.18)), length(p - vec2(-0.18, -0.08)))));
    if (m < 0.04) { A = 0.5; B = 1.0; }
  } else if (uMode < 2.5) {
    if (abs(length(p) - 0.18) < 0.016) { A = 0.5; B = 1.0; }
  } else if (uMode < 3.5) {
    if (n > 0.42) { A = 0.5; B = 0.35 + 0.65 * n; }
  } else if (abs(p.y) < 0.014 && abs(p.x) < 0.38) {
    A = 0.5;
    B = 1.0;
  }
  if (uMode < 3.5 && n > 0.985) { A = 0.5; B = 1.0; }
  fragColor = vec4(A, B, 0.0, 1.0);
}
`;

const STAMP = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uErase;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec2 st = texture(uState, vUv).rg;
  float d = distance(vUv, uPoint);
  float s = smoothstep(uRadius, uRadius * 0.35, d);
  if (uErase > 0.5) {
    st.r = mix(st.r, 1.0, s);
    st.g = mix(st.g, 0.0, s);
  } else {
    st.r = mix(st.r, 0.5, s);
    st.g = mix(st.g, 1.0, s);
  }
  fragColor = vec4(st, 0.0, 1.0);
}
`;

const DISPLAY = `#version 300 es
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float b = texture(uState, vUv).g;
  float bx = texture(uState, vUv + vec2(uTexel.x, 0.0)).g;
  float by = texture(uState, vUv + vec2(0.0, uTexel.y)).g;
  float light = clamp(0.62 + (bx - b) * 5.5 + (by - b) * 4.0, 0.35, 1.35);
  vec3 ink = vec3(0.047, 0.043, 0.035);
  vec3 bone = vec3(0.953, 0.918, 0.847);
  vec3 brass = vec3(0.831, 0.651, 0.337);
  float t = smoothstep(0.05, 0.62, b);
  vec3 col = mix(ink, bone, t);
  col = mix(col, brass, smoothstep(0.28, 0.9, b));
  col *= light;
  fragColor = vec4(col, 1.0);
}
`;

const READ = `#version 300 es
precision highp float;
uniform sampler2D uState;
in vec2 vUv;
out vec4 fragColor;
void main() {
  float b = clamp(texture(uState, vUv).g, 0.0, 1.0);
  fragColor = vec4(b, b, b, 1.0);
}
`;

type Prog = {
  program: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null>;
};

export type FieldParams = {
  feed: number;
  kill: number;
  fold: FoldId;
  edge: "tile" | "island";
  seed: SeedStyle;
  seedNonce: number;
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

export function intoDomain(u: number, v: number, fold: FoldId): [number, number] {
  if (fold === "split") return [Math.max(u, 1 - u), v];
  if (fold === "stack") return [u, Math.max(v, 1 - v)];
  if (fold === "quad") return [Math.max(u, 1 - u), Math.max(v, 1 - v)];
  if (fold === "open") return [u, v];
  const n = fold === "tri" ? 3 : fold === "hex" ? 6 : 8;
  const x = u * 2 - 1;
  const y = v * 2 - 1;
  const r = Math.hypot(x, y);
  const tau = Math.PI * 2;
  let ang = (Math.atan2(y, x) + tau) % tau;
  const wedge = Math.PI / n;
  let m = ang % (wedge * 2);
  if (m > wedge) m = wedge * 2 - m;
  return [clamp01((Math.cos(m) * r + 1) / 2), clamp01((Math.sin(m) * r + 1) / 2)];
}

export class RdEngine {
  readonly canvas: HTMLCanvasElement;
  readonly simSize = SIM_SIZE;
  cycles = 0;
  private gl: WebGL2RenderingContext;
  private vao: WebGLVertexArrayObject;
  private textures: [WebGLTexture, WebGLTexture];
  private frames: [WebGLFramebuffer, WebGLFramebuffer];
  private readTex: WebGLTexture;
  private readFbo: WebGLFramebuffer;
  private front = 0;
  private sim: Prog;
  private fold: Prog;
  private seed: Prog;
  private stamp: Prog;
  private display: Prog;
  private read: Prog;
  private view = { x: 0, y: 0, s: 2 };

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 is not available in this browser.");
    if (!gl.getExtension("EXT_color_buffer_float")) {
      throw new Error("This browser cannot draw floating-point color buffers.");
    }
    this.canvas = canvas;
    this.gl = gl;
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Could not create a vertex array.");
    this.vao = vao;
    gl.bindVertexArray(vao);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);

    this.textures = [this.makeFloatTex(), this.makeFloatTex()];
    this.frames = [this.attach(this.textures[0]), this.attach(this.textures[1])];
    this.readTex = this.makeByteTex();
    this.readFbo = this.attach(this.readTex);

    this.sim = this.program(SIM, ["uState", "uTexel", "uFeed", "uKill", "uDelta"]);
    this.fold = this.program(FOLD, ["uState", "uFold"]);
    this.seed = this.program(SEED, ["uMode", "uSeed"]);
    this.stamp = this.program(STAMP, ["uState", "uPoint", "uRadius", "uErase"]);
    this.display = this.program(DISPLAY, ["uState", "uTexel"]);
    this.read = this.program(READ, ["uState"]);
    this.clear();
  }

  dispose() {
    const gl = this.gl;
    for (const tex of this.textures) gl.deleteTexture(tex);
    gl.deleteTexture(this.readTex);
    for (const fbo of this.frames) gl.deleteFramebuffer(fbo);
    gl.deleteFramebuffer(this.readFbo);
    for (const prog of [this.sim, this.fold, this.seed, this.stamp, this.display, this.read]) {
      gl.deleteProgram(prog.program);
    }
    gl.deleteVertexArray(this.vao);
  }

  clear() {
    this.pass(this.seed, 1 - this.front, this.simSize, () => {
      this.uniform1f(this.seed, "uMode", -1);
      this.uniform1f(this.seed, "uSeed", 0);
    });
    this.cycles = 0;
  }

  reseed(params: FieldParams) {
    this.pass(this.seed, 1 - this.front, this.simSize, () => {
      this.uniform1f(this.seed, "uMode", seedMode(params.seed));
      this.uniform1f(this.seed, "uSeed", params.seedNonce * 17.13 + 3.7);
    });
    if (params.fold !== "open") this.passFold(params.fold);
    const warm = params.seed === "dust" ? 160 : 110;
    this.step(warm, params);
  }

  step(count: number, params: FieldParams) {
    const wrap =
      params.fold === "open" && params.edge === "tile" ? this.gl.REPEAT : this.gl.CLAMP_TO_EDGE;
    this.setWrap(wrap);
    const n = Math.max(0, Math.round(count));
    for (let i = 0; i < n; i++) {
      this.pass(this.sim, 1 - this.front, this.simSize, () => {
        this.bindFront(this.sim);
        this.uniform2f(this.sim, "uTexel", 1 / this.simSize, 1 / this.simSize);
        this.uniform1f(this.sim, "uFeed", params.feed);
        this.uniform1f(this.sim, "uKill", params.kill);
        this.uniform1f(this.sim, "uDelta", 1);
      });
      if (params.fold !== "open") this.passFold(params.fold);
    }
    this.cycles += n;
  }

  paint(u: number, v: number, radius: number, erase: boolean, fold: FoldId) {
    const point = intoDomain(u, v, fold);
    this.setWrap(this.gl.CLAMP_TO_EDGE);
    this.pass(this.stamp, 1 - this.front, this.simSize, () => {
      this.bindFront(this.stamp);
      this.uniform2f(this.stamp, "uPoint", point[0], point[1]);
      this.uniform1f(this.stamp, "uRadius", radius);
      this.uniform1f(this.stamp, "uErase", erase ? 1 : 0);
    });
    if (fold !== "open") this.passFold(fold);
  }

  draw() {
    const gl = this.gl;
    this.fit();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.047, 0.043, 0.035, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(this.view.x, this.view.y, this.view.s, this.view.s);
    gl.useProgram(this.display.program);
    gl.bindVertexArray(this.vao);
    this.bindFront(this.display);
    this.uniform2f(this.display, "uTexel", 1 / this.simSize, 1 / this.simSize);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Square field, row 0 is the top of the image, values 0..1. */
  readField(): Float32Array {
    const gl = this.gl;
    const res = this.simSize;
    this.pass(this.read, this.readFbo, res, () => {
      this.bindFront(this.read);
    }, true);
    const buf = new Uint8Array(res * res * 4);
    gl.readPixels(0, 0, res, res, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const out = new Float32Array(res * res);
    for (let y = 0; y < res; y++) {
      const src = res - 1 - y;
      for (let x = 0; x < res; x++) out[y * res + x] = (buf[(src * res + x) * 4] ?? 0) / 255;
    }
    return out;
  }

  saveImage(filename: string) {
    this.draw();
    this.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  pointerUv(clientX: number, clientY: number): [number, number] | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const px = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const py = ((clientY - rect.top) / rect.height) * this.canvas.height;
    const glY = this.canvas.height - py;
    const u = (px - this.view.x) / this.view.s;
    const v = (glY - this.view.y) / this.view.s;
    if (u < 0 || v < 0 || u > 1 || v > 1) return null;
    return [u, v];
  }

  private passFold(fold: FoldId) {
    this.setWrap(this.gl.CLAMP_TO_EDGE);
    this.pass(this.fold, 1 - this.front, this.simSize, () => {
      this.bindFront(this.fold);
      this.uniform1i(this.fold, "uFold", foldIndex(fold));
    });
  }

  private fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    const s = Math.min(w, h);
    this.view = { x: Math.floor((w - s) / 2), y: Math.floor((h - s) / 2), s };
  }

  private setWrap(mode: number) {
    const gl = this.gl;
    for (const tex of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mode);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mode);
    }
  }

  private pass(
    prog: Prog,
    target: WebGLFramebuffer | number,
    size: number,
    uniforms: () => void,
    keepFront = false,
  ) {
    const gl = this.gl;
    const fbo = typeof target === "number" ? this.frames[target] : target;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, size, size);
    gl.useProgram(prog.program);
    gl.bindVertexArray(this.vao);
    uniforms();
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!keepFront && typeof target === "number") this.front = target;
  }

  private bindFront(prog: Prog) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.front]);
    const loc = prog.loc.uState;
    if (loc) gl.uniform1i(loc, 0);
  }

  private uniform1f(prog: Prog, name: string, value: number) {
    const loc = prog.loc[name];
    if (loc) this.gl.uniform1f(loc, value);
  }

  private uniform1i(prog: Prog, name: string, value: number) {
    const loc = prog.loc[name];
    if (loc) this.gl.uniform1i(loc, value);
  }

  private uniform2f(prog: Prog, name: string, x: number, y: number) {
    const loc = prog.loc[name];
    if (loc) this.gl.uniform2f(loc, x, y);
  }

  private makeFloatTex() {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Could not allocate a simulation texture.");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      this.simSize,
      this.simSize,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private makeByteTex() {
    const gl = this.gl;
    const tex = gl.createTexture();
    if (!tex) throw new Error("Could not allocate a readback texture.");
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      this.simSize,
      this.simSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private attach(tex: WebGLTexture) {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error("Could not allocate a framebuffer.");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete (${status}).`);
    }
    return fbo;
  }

  private program(source: string, names: string[]): Prog {
    const gl = this.gl;
    const program = gl.createProgram();
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!program || !vs || !fs) throw new Error("Could not create a shader program.");
    gl.shaderSource(vs, VERT);
    gl.shaderSource(fs, source);
    gl.compileShader(vs);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(vs) || "Vertex shader failed.");
    }
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(fs) || "Fragment shader failed.");
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Shader link failed.");
    }
    const loc: Record<string, WebGLUniformLocation | null> = {};
    for (const name of names) loc[name] = gl.getUniformLocation(program, name);
    return { program, loc };
  }
}
