export type OutlineId = "rect" | "disc" | "hex";

export type Pt = { x: number; y: number };

export function pieceSize(outline: OutlineId, plateW: number, plateD: number) {
  if (outline === "disc") {
    const diameter = Math.max(8, plateW);
    return { width: diameter, depth: diameter };
  }
  if (outline === "hex") {
    const across = Math.max(8, plateW);
    return { width: across, depth: across * (Math.sqrt(3) / 2) };
  }
  return { width: Math.max(8, plateW), depth: Math.max(8, plateD) };
}

function hexRadius(width: number) {
  return width / 2;
}

export function hexVertices(width: number): Pt[] {
  const radius = hexRadius(width);
  const rise = (Math.sqrt(3) / 2) * radius;
  return [
    { x: radius, y: 0 },
    { x: radius / 2, y: rise },
    { x: -radius / 2, y: rise },
    { x: -radius, y: 0 },
    { x: -radius / 2, y: -rise },
    { x: radius / 2, y: -rise },
  ];
}

export function outlinePolygon(outline: OutlineId, width: number, depth: number, segments = 96): Pt[] {
  if (outline === "hex") return hexVertices(width);
  if (outline === "disc") {
    const radius = width / 2;
    const pts: Pt[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return pts;
  }
  const hx = width / 2;
  const hy = depth / 2;
  return [
    { x: -hx, y: -hy },
    { x: hx, y: -hy },
    { x: hx, y: hy },
    { x: -hx, y: hy },
  ];
}

/** Positive inside the plate, negative outside. Millimeters, origin at center. */
export function signedDistance(x: number, y: number, outline: OutlineId, width: number, depth: number) {
  if (outline === "rect") {
    const inside = Math.min(width / 2 - Math.abs(x), depth / 2 - Math.abs(y));
    return inside;
  }
  if (outline === "disc") return width / 2 - Math.hypot(x, y);
  return hexDistance(x, y, hexRadius(width));
}

export function contains(x: number, y: number, outline: OutlineId, width: number, depth: number) {
  return signedDistance(x, y, outline, width, depth) >= -1e-4;
}

function hexDistance(x: number, y: number, radius: number) {
  const verts = hexVertices(radius * 2);
  let best = Infinity;
  let inside = true;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    if (!a || !b) continue;
    const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (cross < 0) inside = false;
    best = Math.min(best, segmentDistance(x, y, a.x, a.y, b.x, b.y));
  }
  return inside ? best : -best;
}

function segmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  let t = len < 1e-12 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function projectToOutline(x: number, y: number, outline: OutlineId, width: number, depth: number): Pt {
  const len = Math.hypot(x, y);
  if (len < 1e-6) return { x: width / 2, y: 0 };
  const ux = x / len;
  const uy = y / len;
  if (outline === "disc") {
    const radius = width / 2;
    return { x: ux * radius, y: uy * radius };
  }
  if (outline === "rect") {
    const tx = Math.abs(ux) > 1e-8 ? width / 2 / Math.abs(ux) : Infinity;
    const ty = Math.abs(uy) > 1e-8 ? depth / 2 / Math.abs(uy) : Infinity;
    const t = Math.min(tx, ty);
    return { x: ux * t, y: uy * t };
  }
  const radius = hexRadius(width);
  const verts = hexVertices(width);
  let best = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    if (!a || !b) continue;
    const hit = raySegment(ux, uy, a, b);
    if (hit > 1e-4 && hit < best) best = hit;
  }
  if (!Number.isFinite(best)) return { x: ux * radius, y: uy * radius };
  return { x: ux * best, y: uy * best };
}

function raySegment(ux: number, uy: number, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denom = ux * dy - uy * dx;
  if (Math.abs(denom) < 1e-12) return Infinity;
  const t = (a.x * dy - a.y * dx) / denom;
  const u = (a.x * uy - a.y * ux) / denom;
  if (t > 0 && u >= -1e-4 && u <= 1 + 1e-4) return t;
  return Infinity;
}
