export type Filament = {
  id: string;
  name: string;
  /** Printed material, sRGB hex. */
  color: string;
  /** Empty bed behind the material. Dark filaments get a lighter bed so they stay visible. */
  bed: string;
};

export const FILAMENTS: Filament[] = [
  { id: "white", name: "White", color: "#f4f1ea", bed: "#070706" },
  { id: "black", name: "Black", color: "#161616", bed: "#e6e1d6" },
  { id: "bone", name: "Bone", color: "#e4d2b0", bed: "#070706" },
  { id: "gray", name: "Gray", color: "#b9b9b6", bed: "#070706" },
  { id: "red", name: "Red", color: "#d24a3a", bed: "#070706" },
  { id: "orange", name: "Orange", color: "#e8883a", bed: "#070706" },
  { id: "yellow", name: "Yellow", color: "#e6c15a", bed: "#070706" },
  { id: "green", name: "Green", color: "#3f9a62", bed: "#070706" },
  { id: "blue", name: "Blue", color: "#3a78d8", bed: "#070706" },
  { id: "purple", name: "Purple", color: "#8a56c8", bed: "#070706" },
];

export function filamentById(id: string): Filament {
  return FILAMENTS.find((item) => item.id === id) ?? FILAMENTS[0];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
