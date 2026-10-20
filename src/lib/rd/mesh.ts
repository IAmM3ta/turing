import {
  contains,
  outlinePolygon,
  projectToOutline,
  signedDistance,
  type OutlineId,
  type Pt,
} from "@/lib/rd/shape";

type V = [number, number, number];

export class MeshBuilder {
  private buf: number[] = [];

  get triangles() {
    return Math.floor(this.buf.length / 9);
  }

  positions() {
    return Float32Array.from(this.buf);
  }

  tri(a: V, b: V, c: V, outward: V) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (nx * nx + ny * ny + nz * nz < 1e-10) return;
    const flip = nx * outward[0] + ny * outward[1] + nz * outward[2] < 0;
    const p = flip ? [a, c, b] : [a, b, c];
    for (const v of p) this.buf.push(v[0], v[1], v[2]);
  }

  quad(a: V, b: V, c: V, d: V, outward: V) {
    this.tri(a, b, c, outward);
    this.tri(a, c, d, outward);
  }

  translate(dx: number, dy: number) {
    for (let i = 0; i < this.buf.length; i += 3) {
      this.buf[i] = (this.buf[i] ?? 0) + dx;
      this.buf[i + 1] = (this.buf[i + 1] ?? 0) + dy;
    }
  }

  append(other: MeshBuilder) {
    const extra = other.positions();
    for (let i = 0; i < extra.length; i++) this.buf.push(extra[i] ?? 0);
  }
}

export function latticeMesh(
  mask: Uint8Array,
  cols: number,
  rows: number,
  size: { width: number; depth: number; thickness: number; outline: OutlineId },
) {
  const mesh = new MeshBuilder();
  const { width, depth, thickness, outline } = size;
  const cw = width / cols;
  const cd = depth / rows;
  const reach = 0.55 * Math.hypot(cw, cd);
  const up: V = [0, 0, 1];
  const down: V = [0, 0, -1];

  const raw = (gx: number, gy: number) => ({
    x: -width / 2 + gx * cw,
    y: depth / 2 - gy * cd,
  });

  const corner = (gx: number, gy: number): Pt => {
    const p = raw(gx, gy);
    const sd = signedDistance(p.x, p.y, outline, width, depth);
    if (sd >= reach) return p;
    if (holeCorner(gx, gy)) return p;
    return projectToOutline(p.x, p.y, outline, width, depth);
  };

  const holeCorner = (gx: number, gy: number) => {
    const cells = [
      [gx - 1, gy - 1],
      [gx, gy - 1],
      [gx - 1, gy],
      [gx, gy],
    ];
    for (const [x, y] of cells) {
      if (x === undefined || y === undefined) continue;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (mask[y * cols + x]) continue;
      const p = raw(x + 0.5, y + 0.5);
      if (contains(p.x, p.y, outline, width, depth)) return true;
    }
    return false;
  };

  const at = (gx: number, gy: number, z: number): V => {
    const p = corner(gx, gy);
    return [p.x, p.y, z];
  };

  const solid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < cols && y < rows && mask[y * cols + x] === 1;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!solid(x, y)) continue;
      const nw = at(x, y, thickness);
      const ne = at(x + 1, y, thickness);
      const se = at(x + 1, y + 1, thickness);
      const sw = at(x, y + 1, thickness);
      mesh.quad(nw, ne, se, sw, up);
      mesh.quad(
        [nw[0], nw[1], 0],
        [sw[0], sw[1], 0],
        [se[0], se[1], 0],
        [ne[0], ne[1], 0],
        down,
      );
      if (!solid(x, y - 1)) wall(mesh, nw, ne, mask, cols, rows, width, depth);
      if (!solid(x + 1, y)) wall(mesh, ne, se, mask, cols, rows, width, depth);
      if (!solid(x, y + 1)) wall(mesh, se, sw, mask, cols, rows, width, depth);
      if (!solid(x - 1, y)) wall(mesh, sw, nw, mask, cols, rows, width, depth);
    }
  }
  return mesh;
}

function wall(
  mesh: MeshBuilder,
  a: V,
  b: V,
  mask: Uint8Array,
  cols: number,
  rows: number,
  width: number,
  depth: number,
) {
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.04) return;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const solidAt = (sx: number, sy: number) => {
    const gx = ((sx + width / 2) / width) * cols;
    const gy = ((depth / 2 - sy) / depth) * rows;
    const x = Math.floor(gx);
    const y = Math.floor(gy);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false;
    return mask[y * cols + x] === 1;
  };
  const plus = solidAt(mx + px * 0.35, my + py * 0.35);
  const minus = solidAt(mx - px * 0.35, my - py * 0.35);
  let ox = px;
  let oy = py;
  if (plus && !minus) {
    ox = -px;
    oy = -py;
  }
  const outward: V = [ox, oy, 0];
  const a0: V = [a[0], a[1], 0];
  const b0: V = [b[0], b[1], 0];
  mesh.quad(a, b, b0, a0, outward);
}

function skirt(mesh: MeshBuilder, a: V, b: V, outline: OutlineId, width: number, depth: number) {
  if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.04) return;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const n1: V = [-dy / len, dx / len, 0];
  const midX = (a[0] + b[0]) / 2;
  const midY = (a[1] + b[1]) / 2;
  const here = signedDistance(midX, midY, outline, width, depth);
  const there = signedDistance(midX + n1[0] * 0.25, midY + n1[1] * 0.25, outline, width, depth);
  const outward: V = there < here ? n1 : [-n1[0], -n1[1], 0];
  const a0: V = [a[0], a[1], 0];
  const b0: V = [b[0], b[1], 0];
  mesh.quad(a, b, b0, a0, outward);
}

type HP = { x: number; y: number; h: number };

export function reliefMesh(
  heights: Float32Array,
  cols: number,
  rows: number,
  size: { width: number; depth: number; base: number; relief: number; outline: OutlineId },
) {
  const mesh = new MeshBuilder();
  const { width, depth, base, relief, outline } = size;
  const clip = outlinePolygon(outline, width, depth, outline === "disc" ? 80 : 6);
  const vert = (x: number, y: number): HP => ({
    x: (x / (cols - 1) - 0.5) * width,
    y: (0.5 - y / (rows - 1)) * depth,
    h: heights[y * cols + x] ?? 0,
  });
  const eps = 0.28 * Math.min(width / cols, depth / rows);

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const quad = [vert(x, y), vert(x + 1, y), vert(x + 1, y + 1), vert(x, y + 1)];
      const poly = clipPolygon(quad, clip);
      if (poly.length < 3) continue;
      addCap(mesh, poly, (p) => base + p.h * relief, [0, 0, 1]);
      addCap(mesh, poly, () => 0, [0, 0, -1]);
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        if (!a || !b) continue;
        const da = Math.abs(signedDistance(a.x, a.y, outline, width, depth));
        const db = Math.abs(signedDistance(b.x, b.y, outline, width, depth));
        if (da > eps || db > eps) continue;
        const topA: V = [a.x, a.y, base + a.h * relief];
        const topB: V = [b.x, b.y, base + b.h * relief];
        skirt(mesh, topA, topB, outline, width, depth);
      }
    }
  }
  return mesh;
}

function addCap(mesh: MeshBuilder, poly: HP[], zOf: (p: HP) => number, outward: V) {
  let cx = 0;
  let cy = 0;
  let ch = 0;
  for (const p of poly) {
    cx += p.x;
    cy += p.y;
    ch += p.h;
  }
  const n = poly.length;
  const mid: HP = { x: cx / n, y: cy / n, h: ch / n };
  const c: V = [mid.x, mid.y, zOf(mid)];
  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    if (!a || !b) continue;
    mesh.tri(c, [a.x, a.y, zOf(a)], [b.x, b.y, zOf(b)], outward);
  }
}

function clipPolygon(subject: HP[], clip: Pt[]) {
  let output = subject;
  for (let i = 0; i < clip.length; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    if (!a || !b) continue;
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      if (!cur || !prev) continue;
      const curIn = leftOf(cur, a, b);
      const prevIn = leftOf(prev, a, b);
      if (curIn) {
        if (!prevIn) output.push(edgeHit(prev, cur, a, b));
        output.push(cur);
      } else if (prevIn) {
        output.push(edgeHit(prev, cur, a, b));
      }
    }
    if (output.length === 0) return [];
  }
  return output;
}

function leftOf(p: Pt, a: Pt, b: Pt) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-5;
}

function edgeHit(p: HP, q: HP, a: Pt, b: Pt): HP {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const denom = dx * ey - dy * ex;
  let t = 0;
  if (Math.abs(denom) > 1e-12) t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / denom;
  t = Math.min(1, Math.max(0, t));
  return { x: p.x + dx * t, y: p.y + dy * t, h: p.h + (q.h - p.h) * t };
}
