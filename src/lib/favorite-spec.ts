import type { FoldId } from "@/lib/rd/presets";
import { FOLDS } from "@/lib/rd/presets";
import type { MakeId } from "@/lib/rd/recipes";
import type { SeamId } from "@/lib/rd/sample";
import type { OutlineId } from "@/lib/rd/shape";

export type FavoriteSpec = {
  presetId: string;
  feed: number;
  kill: number;
  fold: FoldId;
  foldSides: number;
  edge: "tile" | "island";
  gamma: number;
  invert: boolean;
  smooth: number;
  crisp: number;
  plateW: number;
  plateD: number;
  baseMm: number;
  reliefMm: number;
  printRes: number;
  make: MakeId;
  outline: OutlineId;
  threshold: number;
  rimMm: number;
  wall: number;
  tileMm: number;
  gapMm: number;
  sheetCols: number;
  sheetRows: number;
  seam: SeamId;
  filamentId: string;
  hanger: boolean;
};

const FOLDS_OK = new Set<string>(FOLDS.map((fold) => fold.id));
const MAKES = new Set<string>(["relief", "lattice", "sheet"]);
const OUTLINES = new Set<string>(["rect", "disc", "hex"]);
const SEAMS = new Set<string>(["solo", "match"]);

function num(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function cleanSpec(input: unknown): FavoriteSpec | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<FavoriteSpec>;
  const fold = typeof raw.fold === "string" && FOLDS_OK.has(raw.fold) ? (raw.fold as FoldId) : null;
  const make = typeof raw.make === "string" && MAKES.has(raw.make) ? (raw.make as MakeId) : null;
  const outline = typeof raw.outline === "string" && OUTLINES.has(raw.outline) ? (raw.outline as OutlineId) : null;
  const seam = typeof raw.seam === "string" && SEAMS.has(raw.seam) ? (raw.seam as SeamId) : null;
  if (!fold || !make || !outline || !seam) return null;
  const presetId = typeof raw.presetId === "string" ? raw.presetId.slice(0, 24) : "worms";
  return {
    presetId,
    feed: num(raw.feed, 0.002, 0.1, 0.037),
    kill: num(raw.kill, 0.02, 0.073, 0.06),
    fold,
    foldSides: Math.round(num(raw.foldSides, 3, 12, 6)),
    edge: raw.edge === "tile" ? "tile" : "island",
    gamma: num(raw.gamma, 0.35, 2.2, 1),
    invert: raw.invert === true,
    smooth: Math.round(num(raw.smooth, 0, 4, 1)),
    crisp: num(raw.crisp, 0, 1, 0.82),
    plateW: num(raw.plateW, 12, 180, 38),
    plateD: num(raw.plateD, 12, 180, 38),
    baseMm: num(raw.baseMm, 0.4, 8, 1.2),
    reliefMm: num(raw.reliefMm, 0.2, 8, 1.8),
    printRes: Math.round(num(raw.printRes, 48, 180, 128)),
    make,
    outline,
    threshold: num(raw.threshold, 0.2, 0.8, 0.4),
    rimMm: num(raw.rimMm, 0, 8, 2),
    wall: Math.round(num(raw.wall, 0, 3, 1)),
    tileMm: num(raw.tileMm, 12, 80, 16),
    gapMm: num(raw.gapMm, 0, 12, 0.8),
    sheetCols: Math.round(num(raw.sheetCols, 1, 5, 1)),
    sheetRows: Math.round(num(raw.sheetRows, 1, 5, 1)),
    seam,
    filamentId: typeof raw.filamentId === "string" ? raw.filamentId.slice(0, 16) : "white",
    hanger: raw.hanger === true,
  };
}

export function specFromStudio(state: FavoriteSpec): FavoriteSpec {
  return cleanSpec(state) ?? cleanSpec({
    fold: "open",
    make: "lattice",
    outline: "disc",
    seam: "solo",
  })!;
}
