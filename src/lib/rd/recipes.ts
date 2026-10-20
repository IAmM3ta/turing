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
  hanger: boolean;
  foldSides?: number;
};

export type Recipe = {
  id: string;
  name: string;
  note: string;
  patch: RecipePatch;
};

const shared: Pick<
  RecipePatch,
  "tileMm" | "gapMm" | "sheetCols" | "sheetRows" | "seam" | "threshold" | "rimMm" | "wall" | "hanger"
> = {
  tileMm: 46,
  gapMm: 0.8,
  sheetCols: 4,
  sheetRows: 3,
  seam: "solo",
  threshold: 0.46,
  rimMm: 3.4,
  wall: 1,
  hanger: false,
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
  return RECIPES.find((recipe) => recipe.id === id) ?? WEAR.find((recipe) => recipe.id === id) ?? RECIPES[0];
}

const jewel = {
  edge: "island" as const,
  gamma: 1,
  invert: false,
  baseMm: 1.2,
  printRes: 128,
  threshold: 0.4,
  wall: 1,
};

/** Flat pieces sized for a printer, not a gallery wall. */
export const WEAR: Recipe[] = [
  {
    id: "pendant",
    name: "Pendant",
    note: "38 mm disc, loop at the top",
    patch: {
      ...shared,
      ...jewel,
      presetId: "print",
      fold: "kaleido",
      foldSides: 6,
      make: "lattice",
      outline: "disc",
      plateW: 38,
      plateD: 38,
      reliefMm: 1.8,
      smooth: 1,
      rimMm: 2.6,
      hanger: true,
    },
  },
  {
    id: "earrings",
    name: "Earrings",
    note: "A pair, 16 mm, each with a loop",
    patch: {
      ...shared,
      ...jewel,
      presetId: "worms",
      fold: "kaleido",
      foldSides: 6,
      make: "sheet",
      outline: "disc",
      plateW: 16,
      plateD: 16,
      reliefMm: 1.6,
      smooth: 0,
      rimMm: 1.6,
      tileMm: 16,
      gapMm: 8,
      sheetCols: 2,
      sheetRows: 1,
      seam: "solo",
      hanger: true,
    },
  },
  {
    id: "charm",
    name: "Charm",
    note: "22 mm hex, loop at the top",
    patch: {
      ...shared,
      ...jewel,
      presetId: "maze",
      fold: "hex",
      foldSides: 6,
      make: "lattice",
      outline: "hex",
      plateW: 22,
      plateD: 22,
      reliefMm: 1.8,
      smooth: 0,
      rimMm: 1.8,
      hanger: true,
    },
  },
  {
    id: "brooch",
    name: "Brooch",
    note: "42 mm disc, low relief",
    patch: {
      ...shared,
      ...jewel,
      presetId: "print",
      fold: "open",
      make: "relief",
      outline: "disc",
      plateW: 42,
      plateD: 42,
      baseMm: 2.2,
      reliefMm: 0.8,
      smooth: 1,
      rimMm: 0,
      wall: 0,
      hanger: false,
      invert: true,
    },
  },
  {
    id: "cuff",
    name: "Cuff band",
    note: "118×22 mm lattice, form or stitch on",
    patch: {
      ...shared,
      ...jewel,
      presetId: "maze",
      fold: "open",
      make: "lattice",
      outline: "rect",
      plateW: 118,
      plateD: 22,
      reliefMm: 2,
      smooth: 1,
      rimMm: 2,
      printRes: 160,
      hanger: false,
    },
  },
  {
    id: "signet",
    name: "Signet",
    note: "16 mm face, glue onto a band",
    patch: {
      ...shared,
      ...jewel,
      presetId: "print",
      fold: "kaleido",
      foldSides: 6,
      make: "relief",
      outline: "hex",
      plateW: 16,
      plateD: 16,
      baseMm: 2,
      reliefMm: 0.7,
      smooth: 0,
      rimMm: 0,
      wall: 0,
      hanger: false,
    },
  },
];
