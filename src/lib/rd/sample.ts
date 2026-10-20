export type SeamId = "solo" | "match";

export type Window = { u0: number; v0: number; u1: number; v1: number };

export function frameWindow(plateW: number, plateD: number): Window {
  const aspect = plateW / Math.max(plateD, 0.001);
  let uw = 1;
  let uh = 1;
  if (aspect > 1) uh = 1 / aspect;
  else uw = aspect;
  const u0 = (1 - uw) / 2;
  const v0 = (1 - uh) / 2;
  return { u0, v0, u1: u0 + uw, v1: v0 + uh };
}

export function tileWindow(
  col: number,
  row: number,
  sheetCols: number,
  sheetRows: number,
  seam: SeamId,
): Window {
  if (seam === "match") {
    const u0 = col / sheetCols;
    const v0 = row / sheetRows;
    return { u0, v0, u1: u0 + 1 / sheetCols, v1: v0 + 1 / sheetRows };
  }
  const span = 0.84;
  const u0 = fract(0.07 + col * 0.37 + row * 0.19);
  const v0 = fract(0.23 + row * 0.41 + col * 0.13);
  return { u0, v0, u1: u0 + span, v1: v0 + span };
}

export function sampleGrid(
  raw: Float32Array,
  sim: number,
  cols: number,
  rows: number,
  window: Window,
  wrap: boolean,
) {
  const out = new Float32Array(cols * rows);
  const du = window.u1 - window.u0;
  const dv = window.v1 - window.v0;
  for (let y = 0; y < rows; y++) {
    const v = window.v0 + ((y + 0.5) / rows) * dv;
    for (let x = 0; x < cols; x++) {
      const u = window.u0 + ((x + 0.5) / cols) * du;
      out[y * cols + x] = bilinear(raw, sim, u, v, wrap);
    }
  }
  return out;
}

function bilinear(src: Float32Array, res: number, u: number, v: number, wrap: boolean) {
  let uu = u;
  let vv = v;
  if (wrap) {
    uu = fract(uu);
    vv = fract(vv);
  } else {
    uu = Math.min(1, Math.max(0, uu));
    vv = Math.min(1, Math.max(0, vv));
  }
  const x = uu * (res - (wrap ? 0 : 1));
  const y = vv * (res - (wrap ? 0 : 1));
  const x0 = Math.floor(x) % res;
  const y0 = Math.floor(y) % res;
  const x1 = wrap ? (x0 + 1) % res : Math.min(res - 1, x0 + 1);
  const y1 = wrap ? (y0 + 1) % res : Math.min(res - 1, y0 + 1);
  const tx = x - Math.floor(x);
  const ty = y - Math.floor(y);
  const at = (yy: number, xx: number) => src[((yy % res) + res) % res * res + (((xx % res) + res) % res)] ?? 0;
  const a = at(y0, x0) * (1 - tx) + at(y0, x1) * tx;
  const b = at(y1, x0) * (1 - tx) + at(y1, x1) * tx;
  return a * (1 - ty) + b * ty;
}

function fract(n: number) {
  return n - Math.floor(n);
}
