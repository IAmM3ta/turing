type V = [number, number, number];

type Tri = { n: V; a: V; b: V; c: V };

function sub(a: V, b: V): V {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(u: V, v: V): V {
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

function dot(a: V, b: V) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(n: V, fallback: V): V {
  const len = Math.hypot(n[0], n[1], n[2]);
  if (len < 1e-12) return fallback;
  return [n[0] / len, n[1] / len, n[2] / len];
}

function addTri(tris: Tri[], a: V, b: V, c: V, outward: V) {
  const n = cross(sub(b, a), sub(c, a));
  if (dot(n, outward) < 0) {
    tris.push({ n: normalize([-n[0], -n[1], -n[2]], outward), a, b: c, c: b });
  } else {
    tris.push({ n: normalize(n, outward), a, b, c });
  }
}

function addQuad(tris: Tri[], a: V, b: V, c: V, d: V, outward: V) {
  const n = cross(sub(b, a), sub(c, a));
  const flip = dot(n, outward) < 0;
  if (!flip) {
    addTri(tris, a, b, c, outward);
    addTri(tris, a, c, d, outward);
  } else {
    addTri(tris, a, c, b, outward);
    addTri(tris, a, d, c, outward);
  }
}

export function triangleCount(cols: number, rows: number) {
  const nx = Math.max(0, cols - 1);
  const ny = Math.max(0, rows - 1);
  return nx * ny * 4 + (nx + ny) * 4;
}

export function heightToStl(
  heights: Float32Array,
  cols: number,
  rows: number,
  size: { width: number; depth: number; base: number; relief: number },
) {
  const tris: Tri[] = [];
  const { width, depth, base, relief } = size;

  const topAt = (x: number, y: number): V => {
    const h = heights[y * cols + x] ?? 0;
    const px = (x / (cols - 1) - 0.5) * width;
    const py = (0.5 - y / (rows - 1)) * depth;
    const pz = base + h * relief;
    return [px, py, pz];
  };
  const botAt = (x: number, y: number): V => {
    const t = topAt(x, y);
    return [t[0], t[1], 0];
  };

  const up: V = [0, 0, 1];
  const down: V = [0, 0, -1];

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const a = topAt(x, y);
      const b = topAt(x + 1, y);
      const c = topAt(x + 1, y + 1);
      const d = topAt(x, y + 1);
      addQuad(tris, a, b, c, d, up);
      addQuad(tris, botAt(x, y), botAt(x + 1, y), botAt(x + 1, y + 1), botAt(x, y + 1), down);
    }
  }

  for (let x = 0; x < cols - 1; x++) {
    addQuad(tris, topAt(x, 0), topAt(x + 1, 0), botAt(x + 1, 0), botAt(x, 0), [0, 1, 0]);
    addQuad(
      tris,
      topAt(x, rows - 1),
      botAt(x, rows - 1),
      botAt(x + 1, rows - 1),
      topAt(x + 1, rows - 1),
      [0, -1, 0],
    );
  }
  for (let y = 0; y < rows - 1; y++) {
    addQuad(tris, topAt(0, y), botAt(0, y), botAt(0, y + 1), topAt(0, y + 1), [-1, 0, 0]);
    addQuad(
      tris,
      topAt(cols - 1, y),
      topAt(cols - 1, y + 1),
      botAt(cols - 1, y + 1),
      botAt(cols - 1, y),
      [1, 0, 0],
    );
  }

  return trisToStl(tris, "TURiNG relief mm Z-up solid plate");
}

function trisToStl(tris: Tri[], header: string) {
  const buffer = new ArrayBuffer(84 + tris.length * 50);
  const view = new DataView(buffer);
  for (let i = 0; i < 80; i++) view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  view.setUint32(80, tris.length, true);
  let offset = 84;
  for (const tri of tris) {
    for (const n of tri.n) {
      view.setFloat32(offset, n, true);
      offset += 4;
    }
    for (const vertex of [tri.a, tri.b, tri.c]) {
      for (const component of vertex) {
        view.setFloat32(offset, component, true);
        offset += 4;
      }
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return buffer;
}

export function meshToStl(positions: Float32Array, header: string) {
  const tris = Math.floor(positions.length / 9);
  const buffer = new ArrayBuffer(84 + tris * 50);
  const view = new DataView(buffer);
  for (let i = 0; i < 80; i++) view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  view.setUint32(80, tris, true);
  let offset = 84;
  for (let t = 0; t < tris; t++) {
    const base = t * 9;
    const ax = positions[base] ?? 0;
    const ay = positions[base + 1] ?? 0;
    const az = positions[base + 2] ?? 0;
    const bx = positions[base + 3] ?? 0;
    const by = positions[base + 4] ?? 0;
    const bz = positions[base + 5] ?? 0;
    const cx = positions[base + 6] ?? 0;
    const cy = positions[base + 7] ?? 0;
    const cz = positions[base + 8] ?? 0;
    let nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    let ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    let nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    for (const n of [nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz]) {
      view.setFloat32(offset, n, true);
      offset += 4;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return buffer;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
