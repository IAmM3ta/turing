import { outlinePolygon, signedDistance, type OutlineId, type Pt } from "@/lib/rd/shape";

export function traceLoops(mask: Uint8Array, cols: number, rows: number, width: number, depth: number) {
  const stride = cols + 1;
  const key = (x: number, y: number) => y * stride + x;
  const adj = new Map<number, number[]>();
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const a = key(x0, y0);
    const b = key(x1, y1);
    const list = adj.get(a);
    if (list) list.push(b);
    else adj.set(a, [b]);
  };
  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cols && y < rows && mask[y * cols + x] === 1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x, y - 1)) add(x, y, x + 1, y);
      if (!solid(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (!solid(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (!solid(x - 1, y)) add(x, y + 1, x, y);
    }
  }

  const used = new Set<string>();
  const loops: Pt[][] = [];
  const cw = width / cols;
  const cd = depth / rows;
  const toWorld = (k: number): Pt => {
    const x = k % stride;
    const y = Math.floor(k / stride);
    return { x: -width / 2 + x * cw, y: depth / 2 - y * cd };
  };

  for (const [start, tos] of adj) {
    for (const first of tos) {
      const stamp = `${start}>${first}`;
      if (used.has(stamp)) continue;
      const idx = [start];
      let prev = start;
      let cur = first;
      used.add(stamp);
      let guard = 0;
      while (cur !== start && guard < mask.length * 8) {
        idx.push(cur);
        const next = pickTurn(prev, cur, adj.get(cur) ?? [], used, stride);
        if (next < 0) break;
        used.add(`${cur}>${next}`);
        prev = cur;
        cur = next;
        guard += 1;
      }
      if (cur === start && idx.length >= 4) loops.push(idx.map(toWorld));
    }
  }
  return loops;
}

function pickTurn(prev: number, cur: number, options: number[], used: Set<string>, stride: number) {
  const px = prev % stride;
  const py = Math.floor(prev / stride);
  const cx = cur % stride;
  const cy = Math.floor(cur / stride);
  const ix = cx - px;
  const iy = cy - py;
  let best = -1;
  let bestScore = Infinity;
  for (const cand of options) {
    if (used.has(`${cur}>${cand}`)) continue;
    const nx = (cand % stride) - cx;
    const ny = Math.floor(cand / stride) - cy;
    const cross = -ix * ny - -iy * nx;
    const dot = -ix * nx + -iy * ny;
    let ang = Math.atan2(cross, dot);
    if (ang <= 1e-4) ang += Math.PI * 2;
    if (ang < bestScore) {
      bestScore = ang;
      best = cand;
    }
  }
  return best;
}

export function simplifyClosed(points: Pt[], epsilon: number) {
  if (points.length < 5) return points;
  const open = rdp(points, epsilon);
  return open.length >= 3 ? open : points;
}

function rdp(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 3) return points.slice();
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return points.slice();
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (!p) continue;
    const d = segmentDistance(p, first, last);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= epsilon) return [first, last];
  const left = rdp(points.slice(0, index + 1), epsilon);
  const right = rdp(points.slice(index), epsilon);
  return left.slice(0, -1).concat(right);
}

function segmentDistance(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  if (len < 1e-12) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function polygonArea(points: Pt[]) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    if (!p || !q) continue;
    area += p.x * q.y - q.x * p.y;
  }
  return area / 2;
}

export function pathData(points: Pt[], originX: number, originY: number, flipY: number) {
  const cmd = points.map((p, i) => {
    const x = (p.x + originX).toFixed(3);
    const y = (flipY - p.y + originY).toFixed(3);
    return `${i === 0 ? "M" : "L"}${x} ${y}`;
  });
  return `${cmd.join(" ")} Z`;
}

export function cutSvg(opts: {
  width: number;
  depth: number;
  loops: Pt[][];
  outline: OutlineId;
  cell: number;
  engrave: boolean;
  offsetX: number;
  offsetY: number;
  boxW: number;
  boxD: number;
}) {
  const { width, depth } = opts;
  const hugs = (loop: Pt[]) =>
    loop.every((p) => Math.abs(signedDistance(p.x, p.y, opts.outline, width, depth)) < opts.cell * 1.35);

  let largest = 0;
  let largestArea = 0;
  opts.loops.forEach((loop, i) => {
    const area = Math.abs(polygonArea(loop));
    if (area > largestArea) {
      largestArea = area;
      largest = i;
    }
  });

  const cuts: Pt[][] = [];
  const fills: Pt[][] = [];
  opts.loops.forEach((loop, i) => {
    const area = Math.abs(polygonArea(loop));
    if (area < 0.35) return;
    const simple = simplifyClosed(loop, opts.cell * 0.42);
    if (opts.engrave) {
      fills.push(simple);
      return;
    }
    if (i === largest && hugs(loop)) {
      cuts.push(outlinePolygon(opts.outline, width, depth, opts.outline === "disc" ? 96 : 6));
    } else {
      cuts.push(simple);
    }
  });

  if (!opts.engrave && cuts.length === 0) {
    cuts.push(outlinePolygon(opts.outline, width, depth, opts.outline === "disc" ? 96 : 6));
  }

  const score = opts.engrave
    ? pathData(
        outlinePolygon(opts.outline, width, depth, opts.outline === "disc" ? 96 : 6),
        opts.boxW / 2 + opts.offsetX,
        -opts.offsetY,
        opts.boxD / 2,
      )
    : "";
  const cutPaths = cuts.map((loop) => pathData(loop, opts.boxW / 2 + opts.offsetX, -opts.offsetY, opts.boxD / 2)).join(" ");
  const fillPaths = fills
    .map((loop) => pathData(loop, opts.boxW / 2 + opts.offsetX, -opts.offsetY, opts.boxD / 2))
    .join(" ");

  return { cutPaths, fillPaths, score, width, depth };
}

export function svgDocument(parts: ReturnType<typeof cutSvg>[], sheet: { width: number; depth: number }) {
  const body = parts
    .map((part) => {
      const engrave = part.fillPaths
        ? `<path id="engrave" fill="#16140f" stroke="none" fill-rule="evenodd" d="${part.fillPaths}"/>`
        : "";
      const score = part.score
        ? `<path id="score" fill="none" stroke="#e23b2f" stroke-width="0.2" d="${part.score}"/>`
        : "";
      const cut = part.cutPaths
        ? `<path id="cut" fill="none" stroke="#e23b2f" stroke-width="0.2" d="${part.cutPaths}"/>`
        : "";
      return `${engrave}${score}${cut}`;
    })
    .join("");
  const w = sheet.width.toFixed(2);
  const h = sheet.depth.toFixed(2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">
  ${body}
</svg>
`;
}
