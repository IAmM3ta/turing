import { SIM_SIZE } from "@/lib/rd/engine";
import { bakeHeight, plateGrid } from "@/lib/rd/height";
import { buildMask } from "@/lib/rd/mask";
import { latticeMesh, MeshBuilder, reliefMesh } from "@/lib/rd/mesh";
import type { MakeId } from "@/lib/rd/recipes";
import { frameWindow, sampleGrid, tileWindow, type SeamId } from "@/lib/rd/sample";
import { contains, pieceSize, type OutlineId } from "@/lib/rd/shape";
import { cutSvg, svgDocument, traceLoops } from "@/lib/rd/svg";

export type PieceSpec = {
  make: MakeId;
  outline: OutlineId;
  plateW: number;
  plateD: number;
  baseMm: number;
  reliefMm: number;
  gamma: number;
  invert: boolean;
  smooth: number;
  printRes: number;
  threshold: number;
  rimMm: number;
  wall: number;
  tileMm: number;
  gapMm: number;
  sheetCols: number;
  sheetRows: number;
  seam: SeamId;
  wrap: boolean;
  reliefScale: number;
};

export type BuiltPiece = {
  positions: Float32Array;
  triangles: number;
  dropped: number;
  svg: string;
  spanW: number;
  spanD: number;
  thickness: number;
};

export function buildPiece(raw: Float32Array, spec: PieceSpec, quality: "preview" | "export"): BuiltPiece {
  const sheet = spec.make === "sheet";
  const colsN = sheet ? clampInt(spec.sheetCols, 1, 5) : 1;
  const rowsN = sheet ? clampInt(spec.sheetRows, 1, 5) : 1;
  const size = pieceSize(spec.outline, spec.plateW, spec.plateD);
  const tileW = sheet ? Math.max(12, spec.tileMm) : size.width;
  const tileD = sheet ? Math.max(12, spec.tileMm) : size.depth;
  const gap = sheet ? Math.max(0, spec.gapMm) : 0;
  const spanW = sheet ? colsN * tileW + (colsN - 1) * gap : tileW;
  const spanD = sheet ? rowsN * tileD + (rowsN - 1) * gap : tileD;
  const grid = plateGrid(tileW, tileD, resolution(spec, quality, colsN * rowsN));
  const mesh = new MeshBuilder();
  const parts: ReturnType<typeof cutSvg>[] = [];
  let dropped = 0;
  const carved = spec.make === "relief";

  for (let row = 0; row < rowsN; row++) {
    for (let col = 0; col < colsN; col++) {
      const window = sheet ? tileWindow(col, row, colsN, rowsN, spec.seam) : frameWindow(tileW, tileD);
      const outline: OutlineId = sheet ? "rect" : spec.outline;
      const ox = -spanW / 2 + tileW / 2 + col * (tileW + gap);
      const oy = spanD / 2 - tileD / 2 - row * (tileD + gap);
      const sampled = bakeHeight(sampleGrid(raw, SIM_SIZE, grid.cols, grid.rows, window, sheet && spec.wrap), grid.cols, grid.rows, {
        gamma: spec.gamma,
        invert: spec.invert,
        smooth: spec.smooth,
      });
      if (carved) {
        const tile = reliefMesh(sampled, grid.cols, grid.rows, {
          width: tileW,
          depth: tileD,
          base: spec.baseMm,
          relief: spec.reliefMm * spec.reliefScale,
          outline,
        });
        tile.translate(ox, oy);
        mesh.append(tile);
        if (quality === "export") {
          parts.push(svgPart(inkMask(sampled, grid.cols, grid.rows, outline, tileW, tileD, spec.threshold), grid, tileW, tileD, outline, ox, oy, spanW, spanD, true));
        }
      } else {
        const built = buildMask(sampled, grid.cols, grid.rows, {
          outline,
          width: tileW,
          depth: tileD,
          threshold: spec.threshold,
          rimMm: spec.rimMm,
          wall: spec.wall,
        });
        dropped += built.dropped;
        const tile = latticeMesh(built.mask, grid.cols, grid.rows, {
          width: tileW,
          depth: tileD,
          thickness: Math.max(0.4, spec.reliefMm * spec.reliefScale),
          outline,
        });
        tile.translate(ox, oy);
        mesh.append(tile);
        if (quality === "export") {
          parts.push(svgPart(built.mask, grid, tileW, tileD, outline, ox, oy, spanW, spanD, false));
        }
      }
    }
  }

  const positions = mesh.positions();
  const reliefHeight = spec.baseMm + spec.reliefMm * spec.reliefScale;
  return {
    positions,
    triangles: mesh.triangles,
    dropped,
    svg: quality === "export" ? svgDocument(parts, { width: spanW, depth: spanD }) : "",
    spanW,
    spanD,
    thickness: carved ? reliefHeight : Math.max(0.4, spec.reliefMm * spec.reliefScale),
  };
}

function svgPart(
  mask: Uint8Array,
  grid: { cols: number; rows: number },
  tileW: number,
  tileD: number,
  outline: OutlineId,
  ox: number,
  oy: number,
  spanW: number,
  spanD: number,
  engrave: boolean,
) {
  return cutSvg({
    width: tileW,
    depth: tileD,
    loops: traceLoops(mask, grid.cols, grid.rows, tileW, tileD),
    outline,
    cell: Math.min(tileW / grid.cols, tileD / grid.rows),
    engrave,
    offsetX: ox,
    offsetY: oy,
    boxW: spanW,
    boxD: spanD,
  });
}

function inkMask(
  heights: Float32Array,
  cols: number,
  rows: number,
  outline: OutlineId,
  width: number,
  depth: number,
  threshold: number,
) {
  let high = 0;
  let total = 0;
  const inside = new Uint8Array(heights.length);
  const cw = width / cols;
  const cd = depth / rows;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const px = -width / 2 + (x + 0.5) * cw;
      const py = depth / 2 - (y + 0.5) * cd;
      if (!contains(px, py, outline, width, depth)) continue;
      const i = y * cols + x;
      inside[i] = 1;
      total += 1;
      if ((heights[i] ?? 0) >= threshold) high += 1;
    }
  }
  const wantHigh = total === 0 || high <= total / 2;
  const mask = new Uint8Array(heights.length);
  for (let i = 0; i < heights.length; i++) {
    if (!inside[i]) continue;
    const on = (heights[i] ?? 0) >= threshold;
    if (wantHigh ? on : !on) mask[i] = 1;
  }
  return mask;
}

function resolution(spec: PieceSpec, quality: "preview" | "export", tiles: number) {
  let edge = Math.max(24, Math.round(spec.printRes));
  if (quality === "preview") edge = Math.min(edge, spec.make === "sheet" ? 36 : 70);
  if (spec.make === "sheet") {
    const cap = Math.max(28, Math.floor(Math.sqrt((quality === "preview" ? 12000 : 64000) / Math.max(1, tiles))));
    edge = Math.min(edge, cap);
  }
  return edge;
}

function clampInt(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}
