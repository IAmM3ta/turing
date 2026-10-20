import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRESETS, presetById, type FoldId } from "@/lib/rd/presets";
import { recipeById, type MakeId } from "@/lib/rd/recipes";
import type { SeamId } from "@/lib/rd/sample";
import type { OutlineId } from "@/lib/rd/shape";

export type EdgeMode = "tile" | "island";

type StudioData = {
  presetId: string;
  feed: number;
  kill: number;
  rate: number;
  fold: FoldId;
  edge: EdgeMode;
  running: boolean;
  brush: number;
  erase: boolean;
  gamma: number;
  invert: boolean;
  smooth: number;
  plateW: number;
  plateD: number;
  baseMm: number;
  reliefMm: number;
  printRes: number;
  boost: boolean;
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
  seedNonce: number;
  cycles: number;
  engineReady: boolean;
  notice: string;
};

type StudioActions = {
  setFeed: (feed: number) => void;
  setKill: (kill: number) => void;
  setRate: (rate: number) => void;
  setBrush: (brush: number) => void;
  setGamma: (gamma: number) => void;
  setSmooth: (smooth: number) => void;
  setPlate: (key: "plateW" | "plateD" | "baseMm" | "reliefMm", value: number) => void;
  setFold: (fold: FoldId) => void;
  setEdge: (edge: EdgeMode) => void;
  setPrintRes: (printRes: number) => void;
  setMake: (make: MakeId) => void;
  setOutline: (outline: OutlineId) => void;
  setThreshold: (threshold: number) => void;
  setRim: (rimMm: number) => void;
  setWall: (wall: number) => void;
  setTile: (tileMm: number) => void;
  setGap: (gapMm: number) => void;
  setSheet: (sheetCols: number, sheetRows: number) => void;
  setSeam: (seam: SeamId) => void;
  applyRecipe: (id: string) => void;
  toggleRun: () => void;
  toggleErase: () => void;
  toggleInvert: () => void;
  toggleBoost: () => void;
  applyPreset: (id: string) => void;
  restoreChemistry: () => void;
  reseed: () => void;
  surprise: () => void;
  setCycles: (cycles: number) => void;
  setEngineReady: (engineReady: boolean) => void;
  setNotice: (notice: string) => void;
};

const start = recipeById("grill");

const initial: StudioData = {
  presetId: start.patch.presetId,
  feed: presetById(start.patch.presetId).feed,
  kill: presetById(start.patch.presetId).kill,
  rate: 12,
  fold: start.patch.fold,
  edge: start.patch.edge,
  running: true,
  brush: 0.03,
  erase: false,
  gamma: start.patch.gamma,
  invert: start.patch.invert,
  smooth: start.patch.smooth,
  plateW: start.patch.plateW,
  plateD: start.patch.plateD,
  baseMm: start.patch.baseMm,
  reliefMm: start.patch.reliefMm,
  printRes: start.patch.printRes,
  boost: true,
  make: start.patch.make,
  outline: start.patch.outline,
  threshold: start.patch.threshold,
  rimMm: start.patch.rimMm,
  wall: start.patch.wall,
  tileMm: start.patch.tileMm,
  gapMm: start.patch.gapMm,
  sheetCols: start.patch.sheetCols,
  sheetRows: start.patch.sheetRows,
  seam: start.patch.seam,
  seedNonce: 1,
  cycles: 0,
  engineReady: false,
  notice: "",
};

export const useStudio = create<StudioData & StudioActions>()(
  persist(
    (set, get) => ({
      ...initial,
      setFeed: (feed) => set({ feed }),
      setKill: (kill) => set({ kill }),
      setRate: (rate) => set({ rate }),
      setBrush: (brush) => set({ brush }),
      setGamma: (gamma) => set({ gamma }),
      setSmooth: (smooth) => set({ smooth }),
      setPlate: (key, value) => set({ [key]: value }),
      setFold: (fold) => set({ fold }),
      setEdge: (edge) => set({ edge }),
      setPrintRes: (printRes) => set({ printRes }),
      setMake: (make) => set({ make }),
      setOutline: (outline) => set({ outline }),
      setThreshold: (threshold) => set({ threshold }),
      setRim: (rimMm) => set({ rimMm }),
      setWall: (wall) => set({ wall }),
      setTile: (tileMm) => set({ tileMm }),
      setGap: (gapMm) => set({ gapMm }),
      setSheet: (sheetCols, sheetRows) => set({ sheetCols, sheetRows }),
      setSeam: (seam) => set({ seam }),
      applyRecipe: (id) => {
        const recipe = recipeById(id);
        const preset = presetById(recipe.patch.presetId);
        set({
          ...recipe.patch,
          feed: preset.feed,
          kill: preset.kill,
          seedNonce: get().seedNonce + 1,
          running: true,
          notice: recipe.name,
        });
      },
      toggleRun: () => set({ running: !get().running }),
      toggleErase: () => set({ erase: !get().erase }),
      toggleInvert: () => set({ invert: !get().invert }),
      toggleBoost: () => set({ boost: !get().boost }),
      applyPreset: (id) => {
        const preset = presetById(id);
        set({
          presetId: preset.id,
          feed: preset.feed,
          kill: preset.kill,
          seedNonce: get().seedNonce + 1,
          notice: "",
        });
      },
      restoreChemistry: () => {
        const preset = presetById(get().presetId);
        set({ feed: preset.feed, kill: preset.kill });
      },
      reseed: () => set({ seedNonce: get().seedNonce + 1, notice: "" }),
      surprise: () => {
        const preset = PRESETS[Math.floor(Math.random() * PRESETS.length)] ?? PRESETS[0];
        const folds: FoldId[] = ["open", "split", "stack", "quad", "tri", "hex", "oct"];
        const fold = folds[Math.floor(Math.random() * folds.length)] ?? "hex";
        set({
          presetId: preset.id,
          feed: clamp(preset.feed + (Math.random() - 0.5) * 0.004, 0.002, 0.1),
          kill: clamp(preset.kill + (Math.random() - 0.5) * 0.0025, 0.02, 0.073),
          fold,
          seedNonce: get().seedNonce + 1,
          running: true,
          notice: `${preset.name} · ${fold}`,
        });
      },
      setCycles: (cycles) => set({ cycles }),
      setEngineReady: (engineReady) => set({ engineReady }),
      setNotice: (notice) => set({ notice }),
    }),
    {
      name: "forma-studio-2",
      skipHydration: true,
      partialize: (state) => ({
        presetId: state.presetId,
        feed: state.feed,
        kill: state.kill,
        rate: state.rate,
        fold: state.fold,
        edge: state.edge,
        brush: state.brush,
        erase: state.erase,
        gamma: state.gamma,
        invert: state.invert,
        smooth: state.smooth,
        plateW: state.plateW,
        plateD: state.plateD,
        baseMm: state.baseMm,
        reliefMm: state.reliefMm,
        printRes: state.printRes,
        boost: state.boost,
        make: state.make,
        outline: state.outline,
        threshold: state.threshold,
        rimMm: state.rimMm,
        wall: state.wall,
        tileMm: state.tileMm,
        gapMm: state.gapMm,
        sheetCols: state.sheetCols,
        sheetRows: state.sheetRows,
        seam: state.seam,
      }),
    },
  ),
);

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export type FormaApi = {
  readField: () => Float32Array | null;
  saveImage: (filename: string) => void;
  wipe: () => void;
};
