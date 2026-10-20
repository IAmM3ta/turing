export function plateGrid(plateW: number, plateD: number, longEdge: number) {
  const aspect = plateW / Math.max(plateD, 0.001);
  const edge = Math.max(8, Math.round(longEdge));
  if (aspect >= 1) {
    return { cols: edge, rows: Math.max(8, Math.round(edge / aspect)) };
  }
  return { rows: edge, cols: Math.max(8, Math.round(edge * aspect)) };
}

function bilinear(src: Float32Array, res: number, u: number, v: number) {
  const x = Math.min(res - 1, Math.max(0, u * (res - 1)));
  const y = Math.min(res - 1, Math.max(0, v * (res - 1)));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(res - 1, x0 + 1);
  const y1 = Math.min(res - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const at = (yy: number, xx: number) => src[yy * res + xx] ?? 0;
  const a = at(y0, x0) * (1 - tx) + at(y0, x1) * tx;
  const b = at(y1, x0) * (1 - tx) + at(y1, x1) * tx;
  return a * (1 - ty) + b * ty;
}

/** Crop a square top-left field into the plate aspect, without stretching. */
export function frameHeight(
  raw: Float32Array,
  res: number,
  plateW: number,
  plateD: number,
  cols: number,
  rows: number,
) {
  const aspect = plateW / Math.max(plateD, 0.001);
  let uw = 1;
  let uh = 1;
  if (aspect > 1) uh = 1 / aspect;
  else uw = aspect;
  const u0 = (1 - uw) / 2;
  const v0 = (1 - uh) / 2;
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    const v = rows === 1 ? 0.5 : v0 + (y / (rows - 1)) * uh;
    for (let x = 0; x < cols; x++) {
      const u = cols === 1 ? 0.5 : u0 + (x / (cols - 1)) * uw;
      out[y * cols + x] = bilinear(raw, res, u, v);
    }
  }
  return out;
}

function boxBlur(src: Float32Array, cols: number, rows: number) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let acc = 0;
      for (let k = -1; k <= 1; k++) {
        const xx = Math.min(cols - 1, Math.max(0, x + k));
        acc += src[y * cols + xx];
      }
      tmp[y * cols + x] = acc / 3;
    }
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let acc = 0;
      for (let k = -1; k <= 1; k++) {
        const yy = Math.min(rows - 1, Math.max(0, y + k));
        acc += tmp[yy * cols + x];
      }
      out[y * cols + x] = acc / 3;
    }
  }
  return out;
}

export function bakeHeight(
  src: Float32Array,
  cols: number,
  rows: number,
  opts: { gamma: number; invert: boolean; smooth: number; crisp?: number },
) {
  let cur = src;
  const passes = Math.max(0, Math.min(6, Math.round(opts.smooth)));
  for (let pass = 0; pass < passes; pass++) cur = boxBlur(cur, cols, rows);
  const out = new Float32Array(cur.length);
  const gamma = Math.max(0.05, opts.gamma);
  const crisp = Math.min(1, Math.max(0, opts.crisp ?? 0));
  const lo = 0.04 + 0.12 * crisp;
  const hi = lo + (0.22 - 0.2 * crisp);
  const shaped = new Float32Array(cur.length);
  let peak = 0;
  for (let i = 0; i < cur.length; i++) {
    let v = cur[i] ?? 0;
    if (opts.invert) v = 1 - v;
    v = Math.min(1, Math.max(0, v));
    v = Math.pow(v, gamma);
    shaped[i] = v;
    if (v > peak) peak = v;
  }
  const gain = peak > 0.05 && peak < hi ? Math.min(4, (hi + 0.04) / peak) : 1;
  for (let i = 0; i < shaped.length; i++) {
    let v = Math.min(1, (shaped[i] ?? 0) * gain);
    if (crisp > 0) {
      const x = Math.min(1, Math.max(0, (v - lo) / Math.max(1e-4, hi - lo)));
      const edge = x * x * (3 - 2 * x);
      v = v * (1 - crisp) + edge * crisp;
    }
    out[i] = v;
  }
  return out;
}
