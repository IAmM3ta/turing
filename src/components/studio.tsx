import { useEffect, useRef } from "react";
import { Download, ImagePlus, Pause, Play, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { FieldView } from "@/components/field-view";
import { ReliefView } from "@/components/relief-view";
import { SavedPieces } from "@/components/saved-pieces";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { bakeHeight, frameHeight, plateGrid } from "@/lib/rd/height";
import { SIM_SIZE } from "@/lib/rd/engine";
import { buildPiece, type PieceSpec } from "@/lib/rd/export";
import { FILAMENTS } from "@/lib/rd/filaments";
import { imageLuma } from "@/lib/rd/image-seed";
import { FOLDS, isRadial, mirrorCount, presetById, PRESETS, type FoldId } from "@/lib/rd/presets";
import { RECIPES, WEAR, type Recipe } from "@/lib/rd/recipes";
import type { OutlineId } from "@/lib/rd/shape";
import { formatBytes, heightToStl, meshToStl, triangleCount } from "@/lib/rd/stl";
import { useStudio, type FormaApi } from "@/lib/studio-store";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

export function Studio() {
  const apiRef = useRef<FormaApi | null>(null);

  useEffect(() => {
    const before = useStudio.getState().presetId;
    void Promise.resolve(useStudio.persist.rehydrate()).then(() => {
      const after = useStudio.getState();
      if (after.presetId !== before) after.reseed();
    });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON" || tag === "SUMMARY") return;
      if (event.code === "Space") {
        event.preventDefault();
        useStudio.getState().toggleRun();
      } else if (event.key === "r" || event.key === "R") {
        useStudio.getState().reseed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-bg text-fg lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_24rem] lg:overflow-hidden">
      <section className="lg:flex lg:min-h-0 lg:flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="size-3 rounded-sm bg-brass" aria-hidden />
            <div>
              <p className="text-sm uppercase tracking-widest text-muted">Pattern mill</p>
              <h1
                className="text-[2rem] leading-none tracking-[0.12em]"
                style={{ fontFamily: '"Orbitron", sans-serif' }}
              >
                TURiNG
              </h1>
            </div>
          </div>
          <Cycles />
        </header>
        <div className="px-4 pb-4 lg:min-h-0 lg:flex-1 lg:px-6 lg:pb-6">
          <FieldView apiRef={apiRef} />
        </div>
      </section>
      <aside className="flex min-w-0 flex-col border-t border-line lg:h-full lg:min-h-0 lg:overflow-hidden lg:border-l lg:border-t-0">
        <Controls apiRef={apiRef} />
      </aside>
    </main>
  );
}

function Cycles() {
  const cycles = useStudio((state) => state.cycles);
  const running = useStudio((state) => state.running);
  return (
    <p className="text-right text-sm text-muted">
      <span className="tabular-nums">{cycles.toLocaleString()}</span>
      <span className="mt-1 block">{running ? "Growing" : "Paused"}</span>
    </p>
  );
}

function Controls({ apiRef }: { apiRef: { current: FormaApi | null } }) {
  const presetId = useStudio((s) => s.presetId);
  const feed = useStudio((s) => s.feed);
  const kill = useStudio((s) => s.kill);
  const rate = useStudio((s) => s.rate);
  const fold = useStudio((s) => s.fold);
  const foldSides = useStudio((s) => s.foldSides);
  const edge = useStudio((s) => s.edge);
  const running = useStudio((s) => s.running);
  const brush = useStudio((s) => s.brush);
  const erase = useStudio((s) => s.erase);
  const gamma = useStudio((s) => s.gamma);
  const invert = useStudio((s) => s.invert);
  const smooth = useStudio((s) => s.smooth);
  const crisp = useStudio((s) => s.crisp);
  const plateW = useStudio((s) => s.plateW);
  const plateD = useStudio((s) => s.plateD);
  const baseMm = useStudio((s) => s.baseMm);
  const reliefMm = useStudio((s) => s.reliefMm);
  const printRes = useStudio((s) => s.printRes);
  const boost = useStudio((s) => s.boost);
  const make = useStudio((s) => s.make);
  const outline = useStudio((s) => s.outline);
  const threshold = useStudio((s) => s.threshold);
  const rimMm = useStudio((s) => s.rimMm);
  const wall = useStudio((s) => s.wall);
  const tileMm = useStudio((s) => s.tileMm);
  const gapMm = useStudio((s) => s.gapMm);
  const sheetCols = useStudio((s) => s.sheetCols);
  const sheetRows = useStudio((s) => s.sheetRows);
  const seam = useStudio((s) => s.seam);
  const filamentId = useStudio((s) => s.filamentId);
  const hanger = useStudio((s) => s.hanger);
  const ready = useStudio((s) => s.engineReady);
  const notice = useStudio((s) => s.notice);

  const preset = presetById(presetId);
  const tuned = Math.abs(preset.feed - feed) > 0.0002 || Math.abs(preset.kill - kill) > 0.0002;
  const grid = plateGrid(plateW, plateD, printRes);
  const tiles = make === "sheet" ? sheetCols * sheetRows : 1;
  const tris =
    make === "relief" && outline === "rect"
      ? triangleCount(grid.cols, grid.rows)
      : Math.round(printRes * printRes * tiles * (make === "relief" ? 4 : 3));
  const fileLine = `${tris.toLocaleString()} tris · ${formatBytes(84 + tris * 50)}`;

  const saveBlob = (buffer: BlobPart, name: string, type: string) => {
    const url = URL.createObjectURL(new Blob([buffer], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    useStudio.getState().setNotice(`Saved ${name}`);
  };

  const read = () => {
    const api = apiRef.current;
    const state = useStudio.getState();
    if (!api) return null;
    const raw = api.readField();
    if (!raw) {
      state.setNotice("The bath isn’t ready yet.");
      return null;
    }
    return { raw, state };
  };

  const download = () => {
    const got = read();
    if (!got) return;
    const { raw, state } = got;
    if (state.make === "relief" && state.outline === "rect") {
      const plate = plateGrid(state.plateW, state.plateD, state.printRes);
      const framed = frameHeight(raw, SIM_SIZE, state.plateW, state.plateD, plate.cols, plate.rows);
      const baked = bakeHeight(framed, plate.cols, plate.rows, {
        gamma: state.gamma,
        invert: state.invert,
        smooth: state.smooth,
        crisp: state.crisp,
      });
      const buffer = heightToStl(baked, plate.cols, plate.rows, {
        width: state.plateW,
        depth: state.plateD,
        base: state.baseMm,
        relief: state.reliefMm,
      });
      saveBlob(buffer, `turing-${state.presetId}-plate.stl`, "model/stl");
      return;
    }
    const built = buildPiece(raw, toSpec(state), "export");
    if (built.triangles < 8) {
      state.setNotice("Nothing solid to export. Open fewer holes, or add a rim.");
      return;
    }
    const buffer = meshToStl(built.positions, "TURiNG millimeters Z-up");
    saveBlob(buffer, fileName(state, "stl"), "model/stl");
    if (built.dropped > 12) {
      state.setNotice("Saved. Loose islands were left out so it prints as one piece.");
    }
  };

  const downloadSvg = () => {
    const got = read();
    if (!got) return;
    const built = buildPiece(got.raw, toSpec(got.state), "export");
    if (!built.svg.includes("<path")) {
      got.state.setNotice("No paths yet. Let the pattern grow, then try again.");
      return;
    }
    saveBlob(built.svg, fileName(got.state, "svg"), "image/svg+xml");
  };

  return (
    <div className="flex flex-col lg:min-h-0 lg:flex-1">
      <div className="grid gap-5 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        <AccountRow />
        <FilamentPick id={filamentId} />
        <Mirror fold={fold} sides={foldSides} />
        <WearNow
          now={{
            presetId,
            make,
            outline,
            fold,
            foldSides,
            edge,
            plateW,
            threshold,
            rimMm,
            reliefMm,
            wall,
            invert,
            sheetCols,
            sheetRows,
            seam,
            hanger,
          }}
        />
        <SavedPieces apiRef={apiRef} />

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Piece</h2>
            <p className="text-sm text-muted">From the bath</p>
          </div>
          <div className="grid gap-2">
            {RECIPES.map((recipe) => {
              const on = recipeLive(recipe, {
                presetId,
                make,
                outline,
                fold,
                edge,
                plateW,
                threshold,
                rimMm,
                reliefMm,
                wall,
                invert,
                sheetCols,
                sheetRows,
                seam,
                hanger,
                foldSides,
              });
              return (
                <button
                  key={recipe.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => useStudio.getState().applyRecipe(recipe.id)}
                  className={cn(
                    "flex min-h-11 flex-col items-start rounded-md border px-3 py-2 text-left",
                    on ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
                  )}
                >
                  <span className="text-sm font-medium">{recipe.name}</span>
                  <span className={cn("text-sm", on ? "opacity-80" : "text-muted")}>{recipe.note}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xl">Cut</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["relief", "Relief"],
                ["lattice", "Lattice"],
                ["sheet", "Tiles"],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                type="button"
                aria-pressed={make === id}
                onClick={() => useStudio.getState().setMake(id)}
                className={cn(
                  "h-11 rounded-md border text-sm font-medium",
                  make === id ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
                )}
              >
                {name}
              </button>
            ))}
          </div>
          {make !== "sheet" ? (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(
                [
                  ["rect", "Square"],
                  ["disc", "Round"],
                  ["hex", "Hex"],
                ] as const
              ).map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={outline === id}
                  onClick={() => useStudio.getState().setOutline(id as OutlineId)}
                  className={cn(
                    "h-11 rounded-md border text-sm font-medium",
                    outline === id ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Toggle
                label={seam === "solo" ? "Each its own" : "One picture"}
                on={seam === "match"}
                onClick={() => useStudio.getState().setSeam(seam === "solo" ? "match" : "solo")}
              />
              <p className="self-center text-sm text-pretty text-muted">
                {seam === "match" ? "Edges continue across tiles." : "Every tile is a different crop."}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Bath</h2>
            <p className="text-sm text-muted">{tuned ? "Tuned" : preset.note}</p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {PRESETS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === presetId}
                onClick={() => useStudio.getState().applyPreset(item.id)}
                className={cn(
                  "h-11 shrink-0 rounded-md border px-3 text-sm font-medium",
                  item.id === presetId
                    ? "border-brass bg-brass text-bg"
                    : "border-line bg-surface text-fg",
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => useStudio.getState().toggleRun()} disabled={!ready}>
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            {running ? "Pause" : "Grow"}
          </Button>
          <Button onClick={() => useStudio.getState().reseed()} disabled={!ready}>
            <RotateCcw className="size-4" />
            Reseed
          </Button>
          <ImageSeed apiRef={apiRef} disabled={!ready} />
          <Button onClick={() => useStudio.getState().surprise()} disabled={!ready}>
            <Shuffle className="size-4" />
            Surprise
          </Button>
          <Button
            aria-pressed={erase}
            onClick={() => useStudio.getState().toggleErase()}
            className={erase ? "border-brass text-brass" : undefined}
          >
            {erase ? "Erasing" : "Seeding"}
          </Button>
        </div>

        <Range
          label="Brush"
          min={0.008}
          max={0.09}
          step={0.001}
          value={brush}
          display={brush < 0.02 ? "Fine" : brush > 0.06 ? "Wide" : "Medium"}
          onChange={(value) => useStudio.getState().setBrush(value)}
        />
        <Range
          label="Pace"
          min={1}
          max={28}
          step={1}
          value={rate}
          display={`${rate} / frame`}
          onChange={(value) => useStudio.getState().setRate(value)}
        />
        <div className="flex flex-wrap gap-2">
          <Toggle
            label={fold !== "open" ? "Folded" : edge === "tile" ? "Tile on" : "Tile off"}
            on={fold === "open" && edge === "tile"}
            disabled={fold !== "open"}
            onClick={() => useStudio.getState().setEdge(edge === "tile" ? "island" : "tile")}
          />
          <Button tone="ghost" onClick={() => apiRef.current?.wipe()} disabled={!ready}>
            <Trash2 className="size-4" />
            Wipe
          </Button>
        </div>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xl">Plate</h2>
            <p className="text-sm tabular-nums text-muted">{sizeLine(make, outline, plateW, plateD, tileMm, sheetCols, sheetRows)}</p>
          </div>
          <ReliefView apiRef={apiRef} />
          <p className="mt-2 text-sm text-pretty text-muted">
            {caption(make, boost)} {"Drag to orbit."}
          </p>
        </section>

        {make === "sheet" ? (
          <>
            <div>
              <p className="mb-2 text-sm text-muted">Sheet</p>
              <div className="grid grid-cols-2 gap-2">
                <Count
                  label="Columns"
                  value={sheetCols}
                  onChange={(value) => useStudio.getState().setSheet(value, sheetRows)}
                />
                <Count
                  label="Rows"
                  value={sheetRows}
                  onChange={(value) => useStudio.getState().setSheet(sheetCols, value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <Range
                label="Tile"
                min={28}
                max={80}
                step={1}
                value={tileMm}
                display={`${tileMm.toFixed(0)} mm`}
                onChange={(value) => useStudio.getState().setTile(value)}
              />
              <Range
                label="Gap"
                min={0}
                max={3}
                step={0.1}
                value={gapMm}
                display={gapMm < 0.05 ? "Touching" : `${gapMm.toFixed(1)} mm`}
                onChange={(value) => useStudio.getState().setGap(value)}
              />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-x-4">
            <Range
              label={outline === "rect" ? "Width" : outline === "disc" ? "Diameter" : "Across"}
              min={30}
              max={180}
              step={1}
              value={plateW}
              display={`${plateW.toFixed(0)} mm`}
              onChange={(value) => useStudio.getState().setPlate("plateW", value)}
            />
            {outline === "rect" ? (
              <Range
                label="Depth"
                min={30}
                max={180}
                step={1}
                value={plateD}
                display={`${plateD.toFixed(0)} mm`}
                onChange={(value) => useStudio.getState().setPlate("plateD", value)}
              />
            ) : (
              <div />
            )}
          </div>
        )}

        {make === "relief" ? (
          <div className="grid grid-cols-2 gap-x-4">
            <Range
              label="Base"
              min={0.8}
              max={8}
              step={0.1}
              value={baseMm}
              display={`${baseMm.toFixed(1)} mm`}
              onChange={(value) => useStudio.getState().setPlate("baseMm", value)}
            />
            <Range
              label="Relief"
              min={0.2}
              max={8}
              step={0.1}
              value={reliefMm}
              display={`${reliefMm.toFixed(1)} mm`}
              onChange={(value) => useStudio.getState().setPlate("reliefMm", value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4">
            <Range
              label="Thickness"
              min={1.2}
              max={8}
              step={0.1}
              value={reliefMm}
              display={`${reliefMm.toFixed(1)} mm`}
              onChange={(value) => useStudio.getState().setPlate("reliefMm", value)}
            />
            <Range
              label="Rim"
              min={0}
              max={8}
              step={0.1}
              value={rimMm}
              display={rimMm < 0.05 ? "None" : `${rimMm.toFixed(1)} mm`}
              onChange={(value) => useStudio.getState().setRim(value)}
            />
            <Range
              label="Holes"
              min={0.28}
              max={0.72}
              step={0.01}
              value={threshold}
              display={threshold < 0.38 ? "Chunky" : threshold < 0.5 ? "Balanced" : threshold < 0.62 ? "Open" : "Lace"}
              onChange={(value) => useStudio.getState().setThreshold(value)}
            />
            <Range
              label="Walls"
              min={0}
              max={3}
              step={1}
              value={wall}
              display={wall === 0 ? "Hairline" : wall === 1 ? "Printable" : wall === 2 ? "Thick" : "Heavy"}
              onChange={(value) => useStudio.getState().setWall(value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4">
          <Range
            label="Bite"
            min={0.35}
            max={2.2}
            step={0.05}
            value={gamma}
            display={gamma.toFixed(2)}
            onChange={(value) => useStudio.getState().setGamma(value)}
          />
          <Range
            label="Smooth"
            min={0}
            max={4}
            step={1}
            value={smooth}
            display={smooth === 0 ? "Off" : `${smooth}`}
            onChange={(value) => useStudio.getState().setSmooth(value)}
          />
          <Range
            label="Crisp"
            min={0}
            max={1}
            step={0.01}
            value={crisp}
            display={crisp < 0.35 ? "Soft" : crisp < 0.72 ? "Firm" : "Print"}
            onChange={(value) => useStudio.getState().setCrisp(value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle label={invert ? "Recessed" : "Raised"} on={invert} onClick={() => useStudio.getState().toggleInvert()} />
          <Toggle label={boost ? "Boosted view" : "True scale"} on={boost} onClick={() => useStudio.getState().toggleBoost()} />
          {make !== "relief" ? (
            <Toggle label={hanger ? "Loop on" : "Loop off"} on={hanger} onClick={() => useStudio.getState().setHanger(!hanger)} />
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm text-muted">Print density</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { res: 72, name: "Draft" },
              { res: 112, name: "Fine" },
              { res: 160, name: "Dense" },
            ].map((item) => (
              <button
                key={item.res}
                type="button"
                aria-pressed={printRes === item.res}
                onClick={() => useStudio.getState().setPrintRes(item.res)}
                className={cn(
                  "h-11 rounded-md border text-sm font-medium",
                  printRes === item.res ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <details className="border-t border-line pt-2">
          <summary className="flex h-11 items-center justify-between text-sm">
            <span>Chemistry</span>
            <span className="tabular-nums text-muted">
              F {feed.toFixed(4)} · k {kill.toFixed(4)}
            </span>
          </summary>
          <div className="grid gap-1 pb-2">
            <Range
              label="Feed"
              min={0.002}
              max={0.1}
              step={0.0001}
              value={feed}
              display={feed.toFixed(4)}
              onChange={(value) => useStudio.getState().setFeed(value)}
            />
            <Range
              label="Kill"
              min={0.02}
              max={0.073}
              step={0.0001}
              value={kill}
              display={kill.toFixed(4)}
              onChange={(value) => useStudio.getState().setKill(value)}
            />
            {tuned ? (
              <Button tone="ghost" onClick={() => useStudio.getState().restoreChemistry()}>
                Restore {preset.name}
              </Button>
            ) : null}
          </div>
        </details>
      </div>

      <div className="grid shrink-0 gap-2 border-t border-line bg-bg p-4">
        <Button tone="solid" className="w-full" onClick={download} disabled={!ready}>
          <Download className="size-4" />
          Download STL
        </Button>
        <Button className="w-full" onClick={downloadSvg} disabled={!ready}>
          <Download className="size-4" />
          Download SVG
        </Button>
        <Button
          className="w-full"
          disabled={!ready}
          onClick={() => apiRef.current?.saveImage(`turing-${presetId}-${fold}.png`)}
        >
          Save pattern
        </Button>
        <p className="text-center text-sm tabular-nums text-muted">{fileLine}</p>
        {notice ? <p className="text-center text-sm text-brass">{notice}</p> : null}
        <p className="text-center text-sm text-pretty text-muted">{footerCopy(make)}</p>
      </div>
    </div>
  );
}

function toSpec(state: ReturnType<typeof useStudio.getState>): PieceSpec {
  return {
    make: state.make,
    outline: state.outline,
    plateW: state.plateW,
    plateD: state.plateD,
    baseMm: state.baseMm,
    reliefMm: state.reliefMm,
    gamma: state.gamma,
    invert: state.invert,
    smooth: state.smooth,
    crisp: state.crisp,
    printRes: state.printRes,
    threshold: state.threshold,
    rimMm: state.rimMm,
    wall: state.wall,
    tileMm: state.tileMm,
    gapMm: state.gapMm,
    sheetCols: state.sheetCols,
    sheetRows: state.sheetRows,
    seam: state.seam,
    wrap: state.edge === "tile",
    reliefScale: 1,
    hanger: state.hanger,
  };
}

function fileName(state: ReturnType<typeof useStudio.getState>, ext: string) {
  const kind = state.make === "sheet" ? "tiles" : state.outline === "disc" ? "disc" : state.outline === "hex" ? "hex" : "plate";
  return `turing-${state.presetId}-${kind}.${ext}`;
}

function recipeLive(
  recipe: Recipe,
  now: {
    presetId: string;
    make: string;
    outline: string;
    fold: string;
    edge: string;
    plateW: number;
    threshold: number;
    rimMm: number;
    reliefMm: number;
    wall: number;
    invert: boolean;
    sheetCols: number;
    sheetRows: number;
    seam: string;
    hanger?: boolean;
    foldSides?: number;
  },
) {
  const patch = recipe.patch;
  if (now.presetId !== patch.presetId || now.make !== patch.make || now.outline !== patch.outline) return false;
  if (now.fold !== patch.fold || now.edge !== patch.edge || now.invert !== patch.invert) return false;
  if (now.wall !== patch.wall) return false;
  if ((now.hanger ?? false) !== (patch.hanger ?? false)) return false;
  if (patch.foldSides !== undefined && now.foldSides !== patch.foldSides) return false;
  if (Math.abs(now.plateW - patch.plateW) > 0.6) return false;
  if (Math.abs(now.threshold - patch.threshold) > 0.02) return false;
  if (Math.abs(now.rimMm - patch.rimMm) > 0.2) return false;
  if (Math.abs(now.reliefMm - patch.reliefMm) > 0.2) return false;
  if (patch.make === "sheet" && (now.sheetCols !== patch.sheetCols || now.sheetRows !== patch.sheetRows || now.seam !== patch.seam)) {
    return false;
  }
  return true;
}

function sizeLine(
  make: string,
  outline: string,
  plateW: number,
  plateD: number,
  tileMm: number,
  cols: number,
  rows: number,
) {
  if (make === "sheet") return `${cols}×${rows} · ${tileMm.toFixed(0)} mm`;
  if (outline === "disc") return `${plateW.toFixed(0)} mm round`;
  if (outline === "hex") return `${plateW.toFixed(0)} mm across`;
  return `${plateW.toFixed(0)}×${plateD.toFixed(0)} mm`;
}

function caption(make: string, boost: boolean) {
  if (make === "lattice" || make === "sheet") {
    return boost
      ? "Holes go through. Preview is a bit thicker so the walls read. The file is true scale."
      : "Holes go through. Preview matches the file, in millimeters.";
  }
  return boost
    ? "Preview is 2.5× taller so the relief reads. The STL stays true scale."
    : "Preview matches the STL, in millimeters.";
}

function AccountRow() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-11 animate-pulse rounded-md bg-surface" />;
  if (!user) {
    return (
      <Link
        to="/login"
        className="flex h-11 items-center justify-center rounded-md border border-line bg-surface text-sm font-medium"
      >
        Sign in to save pieces
      </Link>
    );
  }
  return (
    <div className="flex h-11 items-center overflow-hidden">
      <UserButton />
    </div>
  );
}

function WearNow({
  now,
}: {
  now: {
    presetId: string;
    make: string;
    outline: string;
    fold: string;
    foldSides: number;
    edge: string;
    plateW: number;
    threshold: number;
    rimMm: number;
    reliefMm: number;
    wall: number;
    invert: boolean;
    sheetCols: number;
    sheetRows: number;
    seam: string;
    hanger: boolean;
  };
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Wear</h2>
        <p className="text-sm text-muted">Jewelry, in millimeters</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {WEAR.map((recipe) => {
          const on = recipeLive(recipe, now);
          return (
            <button
              key={recipe.id}
              type="button"
              aria-pressed={on}
              onClick={() => useStudio.getState().applyRecipe(recipe.id)}
              className={cn(
                "flex min-h-11 flex-col items-start rounded-md border px-3 py-2 text-left",
                on ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
              )}
            >
              <span className="text-sm font-medium">{recipe.name}</span>
              <span className={cn("text-sm", on ? "opacity-80" : "text-muted")}>{recipe.note}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function footerCopy(make: string) {
  if (make === "sheet") {
    return "STL is one plate of separate tiles, millimeters, Z up. SVG cuts are red, for a laser.";
  }
  if (make === "lattice") {
    return "Open holes go through. STL is millimeters, Z up. SVG is a red cut path for a laser.";
  }
  return "STL is a solid plate, millimeters, Z up. SVG engraves the lines in black and scores the outline in red.";
}

function FilamentPick({ id }: { id: string }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Filament</h2>
        <p className="text-sm text-muted">{FILAMENTS.find((item) => item.id === id)?.name ?? "White"}</p>
      </div>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Filament">
        {FILAMENTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === id}
            aria-label={item.name}
            title={item.name}
            onClick={() => useStudio.getState().setFilament(item.id)}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full border",
              item.id === id ? "border-brass" : "border-line",
            )}
          >
            <span className="size-7 rounded-full" style={{ background: item.color, boxShadow: `inset 0 0 0 1px ${item.bed}` }} />
          </button>
        ))}
      </div>
    </section>
  );
}

function Mirror({ fold, sides }: { fold: FoldId; sides: number }) {
  const radial = isRadial(fold);
  const note = !radial
    ? (FOLDS.find((item) => item.id === fold)?.note ?? "")
    : `${mirrorCount(fold, sides)}-fold kaleidoscope.`;
  const mode = radial ? "kaleido" : fold === "stack" ? "split" : fold;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-xl">Mirror</h2>
        <p className="text-sm text-pretty text-muted">{note}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ["open", "Off"],
            ["split", "Mirror"],
            ["quad", "Quad"],
            ["kaleido", "Kaleido"],
          ] as const
        ).map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              if (id === "kaleido") {
                if (!radial) useStudio.getState().setFold("kaleido");
                return;
              }
              useStudio.getState().setFold(id);
            }}
            className={cn(
              "h-11 rounded-md border text-sm font-medium",
              mode === id ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      {fold === "split" || fold === "stack" ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["split", "Side"],
              ["stack", "Up"],
            ] as const
          ).map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={fold === id}
              onClick={() => useStudio.getState().setFold(id)}
              className={cn(
                "h-11 rounded-md border text-sm font-medium",
                fold === id ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
              )}
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}
      {radial ? (
        <div className="mt-2">
          <Count
            label="Vertices"
            value={mirrorCount(fold, sides)}
            min={3}
            max={12}
            onChange={(value) => useStudio.getState().setFoldSides(value)}
          />
        </div>
      ) : null}
    </section>
  );
}

function ImageSeed({
  apiRef,
  disabled,
}: {
  apiRef: { current: FormaApi | null };
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="absolute h-px w-px overflow-hidden opacity-0"
        aria-hidden
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void (async () => {
            try {
              const bitmap = await createImageBitmap(file);
              const luma = imageLuma(bitmap, SIM_SIZE);
              bitmap.close();
              const api = apiRef.current;
              if (!api) {
                useStudio.getState().setNotice("The bath isn’t ready yet.");
                return;
              }
              api.seedImage(luma);
              useStudio.getState().setNotice(file.name);
            } catch {
              useStudio.getState().setNotice("Could not read that image.");
            }
          })();
        }}
      />
      <Button disabled={disabled} onClick={() => inputRef.current?.click()}>
        <ImagePlus className="size-4" />
        From image
      </Button>
    </>
  );
}

function Count({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex h-11 items-center justify-between gap-1 rounded-md border border-line bg-surface pl-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="flex items-center">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center text-fg"
          aria-label={`Fewer ${label.toLowerCase()}`}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          −
        </button>
        <span className="w-4 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center text-fg"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </span>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-fg">{display}</span>
      </span>
      <input
        className="forma-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({
  on,
  label,
  onClick,
  disabled,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-11 rounded-md border px-3 text-sm font-medium disabled:opacity-40",
        on ? "border-brass bg-brass text-bg" : "border-line bg-surface text-fg",
      )}
    >
      {label}
    </button>
  );
}
