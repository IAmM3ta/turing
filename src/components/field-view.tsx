import { useEffect, useRef, useState } from "react";
import { RdEngine } from "@/lib/rd/engine";
import { filamentById, hexToRgb } from "@/lib/rd/filaments";
import { mirrorCount, presetById } from "@/lib/rd/presets";
import { useStudio, type FormaApi } from "@/lib/studio-store";

type Props = {
  apiRef: { current: FormaApi | null };
};

export function FieldView({ apiRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setHint(false), 3200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let eng: RdEngine;
    try {
      eng = new RdEngine(canvas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The field could not start.");
      return;
    }

    const paint = { active: false };
    let paintUv: [number, number] | null = null;
    let lastNonce = -1;
    let lastUi = 0;
    let raf = 0;
    let alive = true;

    apiRef.current = {
      readField: () => eng.readField(),
      saveImage: (filename) => eng.saveImage(filename),
      wipe: () => {
        eng.clear();
        useStudio.getState().setCycles(0);
      },
      seedImage: (luma) => {
        const state = useStudio.getState();
        eng.seedFromLuma(luma, state.fold, mirrorCount(state.fold, state.foldSides));
        useStudio.getState().setCycles(0);
      },
      thumbnail: () => eng.thumbnail(),
    };
    eng.onRestored = () => {
      lastNonce = -1;
    };
    useStudio.getState().setEngineReady(true);

    const frame = (now: number) => {
      if (!alive) return;
      const state = useStudio.getState();
      if (state.seedNonce !== lastNonce) {
        eng.reseed({
          feed: state.feed,
          kill: state.kill,
          fold: state.fold,
          sides: mirrorCount(state.fold, state.foldSides),
          edge: state.edge,
          seed: presetById(state.presetId).seed,
          seedNonce: state.seedNonce,
        });
        lastNonce = state.seedNonce;
      }
      const params = {
        feed: state.feed,
        kill: state.kill,
        fold: state.fold,
        sides: mirrorCount(state.fold, state.foldSides),
        edge: state.edge,
        seed: presetById(state.presetId).seed,
        seedNonce: state.seedNonce,
      };
      if (state.running && !document.hidden) eng.step(state.rate, params);
      if (paint.active && paintUv) {
        eng.paint(paintUv[0], paintUv[1], state.brush, state.erase, state.fold, params.sides);
      }
      const filament = filamentById(state.filamentId);
      eng.draw(hexToRgb(filament.bed), hexToRgb(filament.color), state.crisp);
      if (now - lastUi > 280 && alive) {
        lastUi = now;
        if (useStudio.getState().cycles !== eng.cycles) useStudio.getState().setCycles(eng.cycles);
      }
      raf = requestAnimationFrame(frame);
    };

    const down = (event: PointerEvent) => {
      paint.active = true;
      canvas.setPointerCapture(event.pointerId);
      paintUv = eng.pointerUv(event.clientX, event.clientY);
      setHint(false);
    };
    const move = (event: PointerEvent) => {
      if (!paint.active) return;
      paintUv = eng.pointerUv(event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      paint.active = false;
      paintUv = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      apiRef.current = null;
      useStudio.getState().setEngineReady(false);
      eng.dispose();
    };
  }, [apiRef]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-field lg:aspect-auto lg:h-full">
      <canvas ref={canvasRef} className="field-canvas" aria-label="Reaction diffusion field. Drag to seed the bath." />
      {hint && !error ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-muted">
          Drag to seed the bath
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-fg">{error}</p>
      ) : null}
    </div>
  );
}
