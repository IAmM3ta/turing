/** Cover-crop an image to the simulation grid and turn its marks into a seed. */
export function imageLuma(bitmap: ImageBitmap, size: number): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not read that image.");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  const data = ctx.getImageData(0, 0, size, size).data;
  const luma = new Float32Array(size * size);
  let sum = 0;
  for (let i = 0; i < luma.length; i++) {
    const r = (data[i * 4] ?? 0) / 255;
    const g = (data[i * 4 + 1] ?? 0) / 255;
    const b = (data[i * 4 + 2] ?? 0) / 255;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luma[i] = y;
    sum += y;
  }
  const mean = sum / luma.length;
  let lo = 1;
  let hi = 0;
  for (let i = 0; i < luma.length; i++) {
    let y = luma[i] ?? 0;
    if (mean > 0.55) y = 1 - y;
    luma[i] = y;
    if (y < lo) lo = y;
    if (y > hi) hi = y;
  }
  const span = Math.max(0.05, hi - lo);
  const out = new Uint8Array(luma.length);
  for (let i = 0; i < luma.length; i++) {
    const n = ((luma[i] ?? 0) - lo) / span;
    const shaped = n < 0.28 ? n * 0.2 : Math.min(1, 0.15 + n * 0.9);
    out[i] = Math.round(Math.min(1, Math.max(0, shaped)) * 255);
  }
  return out;
}
