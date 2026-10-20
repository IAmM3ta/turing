import type { FoldId } from "@/lib/rd/presets";
import type { SeamId } from "@/lib/rd/sample";
import type { OutlineId } from "@/lib/rd/shape";

export type MakeId = "relief" | "lattice" | "sheet";

export type RecipePatch = {
  presetId: string;
  fold: FoldId;
  edge: "tile" | "island";
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
};

export type Recipe = {
  id: string;
  name: string;
  note: string;
  patch: RecipePatch;
};

const shared: Pick<
  RecipePatch,
  "tileMm" | "gapMm" | "sheetCols" | "sheetRows" | "seam" | "threshold" | "rimMm" | "wall"
> = {
  tileMm: 46,
  gapMm: 0.8,
  sheetCols: 4,
  sheetRows: 3,
  seam: "solo",
  threshold: 0.46,
  rimMm: 3.4,
  wall: 1,
};

export const RECIPES: Recipe[] = [
  {
    id: "grill",
    name: "Round grill",
    note: "Pierced disc, solid rim",
    patch: {
      ...shared,
      presetId: "worms",
      fold: "open",
      edge: "island",
      make: "lattice",
      outline: "disc",
      plateW: 110,
      plateD: 110,
      baseMm: 0.8,
      reliefMm: 3.2,
      gamma: 1.05,
      invert: false,
      smooth: 1,
      printRes: 140,
      threshold: 0.44,
      rimMm: 3.6,
      wall: 1,
    },
  },
  {
    id: "tiles",
    name: "Maze tiles",
    note: "A sheet of square labyrinths",
    patch: {
      ...shared,
      presetId: "maze",
      fold: "open",
      edge: "tile",
      make: "sheet",
      outline: "rect",
      plateW: 80,
      plateD: 80,
      baseMm: 0.8,
      reliefMm: 2.4,
      gamma: 1,
      invert: false,
      smooth: 0,
      printRes: 72,
      threshold: 0.48,
      rimMm: 1.5,
      wall: 1,
      tileMm: 46,
      gapMm: 0.8,
      sheetCols: 4,
      sheetRows: 3,
      seam: "solo",
    },
  },
  {
    id: "plaque",
    name: "Hex plaque",
    note: "Carved six-sided plate",
    patch: {
      ...shared,
      presetId: "print",
      fold: "open",
      edge: "island",
      make: "relief",
      outline: "hex",
      plateW: 92,
      plateD: 80,
      baseMm: 3.6,
      reliefMm: 1.1,
      gamma: 0.9,
      invert: true,
      smooth: 1,
      printRes: 132,
      threshold: 0.5,
      rimMm: 0,
      wall: 0,
    },
  },
];

export function recipeById(id: string) {
  return RECIPES.find((recipe) => recipe.id === id) ?? RECIPES[0];
}
