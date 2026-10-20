export const FOLDS = [
  { id: "open", name: "Open", note: "No mirror. Turn on Tile if you want a seamless sheet." },
  { id: "split", name: "Split", note: "Left and right are copies of each other." },
  { id: "stack", name: "Stack", note: "Top and bottom are copies of each other." },
  { id: "quad", name: "Quad", note: "Four-way mirror, like a sheet folded twice." },
  { id: "tri", name: "Tri", note: "Three-fold kaleidoscope." },
  { id: "hex", name: "Hex", note: "Six-fold kaleidoscope. Strong for medallions." },
  { id: "oct", name: "Oct", note: "Eight-fold kaleidoscope." },
  { id: "kaleido", name: "Kaleidoscope", note: "Pick how many wedges meet in the middle." },
] as const;

export type FoldId = (typeof FOLDS)[number]["id"];

export type SeedStyle = "speck" | "bloom" | "ring" | "dust" | "lane";

export type Preset = {
  id: string;
  name: string;
  feed: number;
  kill: number;
  seed: SeedStyle;
  note: string;
};

export const PRESETS: Preset[] = [
  { id: "worms", name: "Worms", feed: 0.078, kill: 0.061, seed: "ring", note: "Dense vermicelli" },
  { id: "print", name: "Print", feed: 0.037, kill: 0.06, seed: "speck", note: "Fingerprint ridges" },
  { id: "maze", name: "Maze", feed: 0.029, kill: 0.057, seed: "dust", note: "Corridor labyrinth" },
  { id: "holes", name: "Holes", feed: 0.039, kill: 0.058, seed: "dust", note: "Pitted sheet" },
  { id: "soliton", name: "Soliton", feed: 0.03, kill: 0.062, seed: "speck", note: "Traveling pulses" },
  { id: "pulse", name: "Pulse", feed: 0.025, kill: 0.06, seed: "bloom", note: "Breathing spots" },
  { id: "loops", name: "Loops", feed: 0.018, kill: 0.051, seed: "ring", note: "Spots that close" },
  { id: "spots", name: "Spots", feed: 0.014, kill: 0.054, seed: "speck", note: "Moving dots" },
  { id: "waves", name: "Waves", feed: 0.014, kill: 0.045, seed: "lane", note: "Long ripples" },
  { id: "uskate", name: "U-Skate", feed: 0.062, kill: 0.06093, seed: "bloom", note: "Classic skate world" },
  { id: "chaos", name: "Chaos", feed: 0.026, kill: 0.051, seed: "dust", note: "Unstable turbulence" },
  { id: "mitosis", name: "Mitosis", feed: 0.0367, kill: 0.0649, seed: "speck", note: "Cells that split" },
];

export function presetById(id: string): Preset {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

export function foldNote(id: FoldId): string {
  return FOLDS.find((fold) => fold.id === id)?.note ?? "";
}

const SEED_MODE: Record<SeedStyle, number> = {
  speck: 0,
  bloom: 1,
  ring: 2,
  dust: 3,
  lane: 4,
};

export function seedMode(style: SeedStyle): number {
  return SEED_MODE[style];
}

export function foldIndex(id: FoldId): number {
  const index = FOLDS.findIndex((fold) => fold.id === id);
  return index < 0 ? 0 : index;
}

export function isRadial(id: FoldId): boolean {
  return id === "tri" || id === "hex" || id === "oct" || id === "kaleido";
}

/** Wedge count for a kaleidoscope. Bilateral folds ignore this. */
export function mirrorCount(id: FoldId, custom: number): number {
  if (id === "tri") return 3;
  if (id === "hex") return 6;
  if (id === "oct") return 8;
  const n = Math.round(custom);
  return Math.min(12, Math.max(3, Number.isFinite(n) ? n : 6));
}
