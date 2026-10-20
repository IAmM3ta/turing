import { signedDistance, type OutlineId } from "@/lib/rd/shape";

export type MaskResult = {
  mask: Uint8Array;
  dropped: number;
};

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

export function buildMask(
  heights: Float32Array,
  cols: number,
  rows: number,
  opts: {
    outline: OutlineId;
    width: number;
    depth: number;
    threshold: number;
    rimMm: number;
    wall: number;
    hanger?: boolean;
  },
): MaskResult {
  const { cols: c, rows: r } = { cols, rows };
  const cw = opts.width / c;
  const cd = opts.depth / r;
  const inside = new Uint8Array(c * r);
  const rim = new Uint8Array(c * r);
  const dist = new Float32Array(c * r);
  const center = (x: number, y: number) => {
    const px = -opts.width / 2 + (x + 0.5) * cw;
    const py = opts.depth / 2 - (y + 0.5) * cd;
    return { px, py };
  };

  for (let y = 0; y < r; y++) {
    for (let x = 0; x < c; x++) {
      const i = y * c + x;
      const { px, py } = center(x, y);
      dist[i] = signedDistance(px, py, opts.outline, opts.width, opts.depth);
      if (dist[i] < -1e-3) continue;
      inside[i] = 1;
      if (dist[i] <= opts.rimMm) rim[i] = 1;
    }
  }

  let mask = new Uint8Array(c * r);
  for (let i = 0; i < mask.length; i++) {
    if (!inside[i]) continue;
    const h = heights[i] ?? 0;
    if (rim[i] || h >= opts.threshold) mask[i] = 1;
  }

  const steps = Math.max(0, Math.min(4, Math.round(opts.wall)));
  for (let step = 0; step < steps; step++) mask = dilate(mask, c, r, inside);
  mask = fillPinholes(mask, c, r, inside, 2);

  let attached = keepFromRim(mask, c, r, rim);
  const cell = Math.min(cw, cd);
  let reach = opts.rimMm + cell * 1.25;
  for (let guard = 0; guard < 5 && attached.dropped > 10; guard++) {
    const grown = dilate(attached.mask, c, r, inside);
    let changed = false;
    for (let i = 0; i < mask.length; i++) {
      if (!grown[i] || mask[i]) continue;
      if ((dist[i] ?? 0) <= reach) {
        mask[i] = 1;
        changed = true;
      }
    }
    if (!changed) break;
    reach += cell;
    attached = keepFromRim(mask, c, r, rim);
  }
  if (opts.hanger) punchHanger(attached.mask, inside, c, r, opts.width, opts.depth);
  return { mask: attached.mask, dropped: attached.dropped };
}

function punchHanger(
  mask: Uint8Array,
  inside: Uint8Array,
  cols: number,
  rows: number,
  width: number,
  depth: number,
) {
  const cw = width / cols;
  const cd = depth / rows;
  const holeR = Math.min(1.8, Math.max(1.15, Math.min(width, depth) * 0.055));
  const ring = Math.max(1.2, holeR * 0.85);
  const cy = depth / 2 - (holeR + ring + 0.5);
  const tab = cy - (holeR + ring + 2.4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!inside[i]) continue;
      const px = -width / 2 + (x + 0.5) * cw;
      const py = depth / 2 - (y + 0.5) * cd;
      if (Math.abs(px) <= ring * 0.85 && py <= cy && py >= tab) mask[i] = 1;
      const d = Math.hypot(px, py - cy);
      if (d <= holeR + ring) mask[i] = 1;
      if (d <= holeR) mask[i] = 0;
    }
  }
}

function dilate(mask: Uint8Array, cols: number, rows: number, inside: Uint8Array) {
  const next = mask.slice();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (mask[i] || !inside[i]) continue;
      for (const [dx, dy] of N4) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
        if (mask[yy * cols + xx]) {
          next[i] = 1;
          break;
        }
      }
    }
  }
  return next;
}

function fillPinholes(mask: Uint8Array, cols: number, rows: number, inside: Uint8Array, maxArea: number) {
  const seen = new Uint8Array(mask.length);
  const next = mask.slice();
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] || seen[i] || !inside[i]) continue;
    const stack = [i];
    const comp: number[] = [];
    let exterior = false;
    seen[i] = 1;
    while (stack.length) {
      const cur = stack.pop();
      if (cur === undefined) break;
      comp.push(cur);
      const x = cur % cols;
      const y = Math.floor(cur / cols);
      for (const [dx, dy] of N4) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) {
          exterior = true;
          continue;
        }
        const j = yy * cols + xx;
        if (!inside[j]) exterior = true;
        if (seen[j] || mask[j]) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (!exterior && comp.length <= maxArea) {
      for (const j of comp) next[j] = 1;
    }
  }
  return next;
}

function keepFromRim(mask: Uint8Array, cols: number, rows: number, rim: Uint8Array) {
  const seen = new Uint8Array(mask.length);
  const stack: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && rim[i]) {
      seen[i] = 1;
      stack.push(i);
    }
  }
  if (stack.length === 0) {
    let biggest = -1;
    for (let i = 0; i < mask.length; i++) if (mask[i]) biggest = i;
    if (biggest >= 0) {
      seen[biggest] = 1;
      stack.push(biggest);
    }
  }
  while (stack.length) {
    const cur = stack.pop();
    if (cur === undefined) break;
    const x = cur % cols;
    const y = Math.floor(cur / cols);
    for (const [dx, dy] of N4) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
      const j = yy * cols + xx;
      if (seen[j] || !mask[j]) continue;
      seen[j] = 1;
      stack.push(j);
    }
  }
  const kept = new Uint8Array(mask.length);
  let dropped = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    if (seen[i]) kept[i] = 1;
    else dropped += 1;
  }
  return { mask: kept, dropped };
}
