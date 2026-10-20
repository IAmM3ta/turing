import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PRESETS, presetById, type FoldId } from "@/lib/rd/presets";
import { recipeById, type MakeId } from "@/lib/rd/recipes";
import type { FavoriteSpec } from "@/lib/favorite-spec";
import type { SeamId } from "@/lib/rd/sample";
import type { OutlineId } from "@/lib/rd/shape";

export type EdgeMode = "tile" | "island";

type StudioData = {
  presetId: string;
  feed: number;
  kill: number;
  rate: number;
  fold: FoldId;
  foldSides: number;
  edge: EdgeMode;
  running: boolean;
  brush: number;
  erase: boolean;
  gamma: number;
  invert: boolean;
  smooth: number;
  crisp: number;
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
  filamentId: string;
  hanger: boolean;
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
  setCrisp: (crisp: number) => void;
  setPlate: (key: "plateW" | "plateD" | "baseMm" | "reliefMm", value: number) => void;
  setFold: (fold: FoldId) => void;
  setFoldSides: (foldSides: number) => void;
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
  setFilament: (filamentId: string) => void;
  setHanger: (hanger: boolean) => void;
  applySpec: (spec: FavoriteSpec, notice?: string) => void;
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
  foldSides: 6,
  edge: start.patch.edge,
  running: true,
  brush: 0.03,
  erase: false,
  gamma: start.patch.gamma,
  invert: start.patch.invert,
  smooth: start.patch.smooth,
  crisp: 0.82,
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
  filamentId: "white",
  hanger: false,
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
      setCrisp: (crisp) => set({ crisp }),
      setPlate: (key, value) => set({ [key]: value }),
      setFold: (fold) => set({ fold }),
      setFoldSides: (foldSides) => set({ foldSides: clamp(Math.round(foldSides), 3, 12), fold: "kaleido" }),
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
      setFilament: (filamentId) => set({ filamentId }),
      setHanger: (hanger) => set({ hanger }),
      applySpec: (spec, notice) =>
        set({
          ...spec,
          seedNonce: get().seedNonce + 1,
          running: true,
          notice: notice ?? "",
        }),
      applyRecipe: (id) => {
        const recipe = recipeById(id);
        const preset = presetById(recipe.patch.presetId);
        set({
          ...recipe.patch,
          foldSides: recipe.patch.foldSides ?? get().foldSides,
          hanger: recipe.patch.hanger ?? false,
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
        const folds: FoldId[] = ["open", "split", "quad", "kaleido"];
        const fold = folds[Math.floor(Math.random() * folds.length)] ?? "hex";
        set({
          presetId: preset.id,
          feed: clamp(preset.feed + (Math.random() - 0.5) * 0.004, 0.002, 0.1),
          kill: clamp(preset.kill + (Math.random() - 0.5) * 0.0025, 0.02, 0.073),
          fold,
          foldSides: 3 + Math.floor(Math.random() * 8),
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
        foldSides: state.foldSides,
        edge: state.edge,
        brush: state.brush,
        erase: state.erase,
        gamma: state.gamma,
        invert: state.invert,
        smooth: state.smooth,
        crisp: state.crisp,
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
        filamentId: state.filamentId,
        hanger: state.hanger,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<StudioData>;
        return {
          ...current,
          ...saved,
          filamentId: saved.filamentId || "white",
          crisp: typeof saved.crisp === "number" ? saved.crisp : 0.82,
          foldSides: typeof saved.foldSides === "number" ? saved.foldSides : 6,
          hanger: saved.hanger === true,
        };
      },
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
  seedImage: (luma: Uint8Array) => void;
  thumbnail: () => string;
};
