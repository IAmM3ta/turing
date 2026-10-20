import { useEffect, useRef } from "react";
import type { Material } from "three";
import { buildPiece, type PieceSpec } from "@/lib/rd/export";
import { filamentById } from "@/lib/rd/filaments";
import { bakeHeight, frameHeight, plateGrid } from "@/lib/rd/height";
import { SIM_SIZE } from "@/lib/rd/engine";
import { useStudio, type FormaApi } from "@/lib/studio-store";

type Props = {
  apiRef: { current: FormaApi | null };
};

export function ReliefView({ apiRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let stop = () => {};

    void (async () => {
      const THREE = await import("three");
      if (dead) return;

      const gl = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      if (dead) {
        gl.dispose();
        return;
      }
      gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      gl.setClearColor(0x1c1b16, 1);
      gl.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);
      scene.add(new THREE.AmbientLight(0xfff6ea, 0.7));
      scene.add(new THREE.HemisphereLight(0xf3ead8, 0x2a2418, 0.9));
      const key = new THREE.DirectionalLight(0xfff6e8, 2.5);
      key.position.set(36, 90, 48);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xd4a656, 0.7);
      fill.position.set(-60, 24, -36);
      scene.add(fill);

      const surfaceMat = new THREE.MeshStandardMaterial({
        color: 0xe6d3b0,
        roughness: 0.62,
        metalness: 0.04,
        side: THREE.DoubleSide,
      });
      const cutMat = new THREE.MeshBasicMaterial({
        color: 0xf6f1e6,
        side: THREE.DoubleSide,
      });
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x100e0c,
        roughness: 0.9,
        metalness: 0.02,
      });
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), plinthMat);
      scene.add(plinth);
      let surface: InstanceType<typeof THREE.Mesh> | null = null;
      let span = 110;

      let azimuth = 0.4;
      let polar = 0.58;
      let userDist: number | null = null;
      let dragging = false;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const resize = () => {
        const w = Math.max(2, canvas.clientWidth);
        const h = Math.max(2, canvas.clientHeight);
        gl.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);

      const placeCamera = () => {
        const dist = userDist ?? Math.max(span, 20) * 1.65;
        const x = dist * Math.sin(polar) * Math.sin(azimuth);
        const y = dist * Math.cos(polar);
        const z = dist * Math.sin(polar) * Math.cos(azimuth);
        camera.position.set(x, y, z);
        camera.lookAt(0, 1.5, 0);
      };

      const put = (positions: Float32Array, yLift: number, material: Material) => {
        const flipped = new Float32Array(positions.length);
        for (let i = 0; i < positions.length; i += 3) {
          flipped[i] = positions[i] ?? 0;
          flipped[i + 1] = (positions[i + 2] ?? 0) + yLift;
          flipped[i + 2] = -(positions[i + 1] ?? 0);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(flipped, 3));
        geo.computeVertexNormals();
        if (surface) {
          surface.geometry.dispose();
          scene.remove(surface);
        }
        surface = new THREE.Mesh(geo, material);
        scene.add(surface);
      };

      const apply = () => {
        if (dead) return;
        const state = useStudio.getState();
        const raw = apiRef.current?.readField();
        const filament = filamentById(state.filamentId);
        const plastic = filament.color;
        surfaceMat.color.set(plastic);
        surfaceMat.roughness = filament.id === "black" ? 0.45 : 0.55;
        surfaceMat.metalness = 0.02;
        surfaceMat.needsUpdate = true;
        cutMat.color.set(plastic);
        const classic = state.make === "relief" && state.outline === "rect";
        if (classic) {
          plinthMat.color.set(0x3a3428);
          const { cols, rows } = plateGrid(state.plateW, state.plateD, 80);
          const framed = raw
            ? frameHeight(raw, SIM_SIZE, state.plateW, state.plateD, cols, rows)
            : new Float32Array(cols * rows);
          const baked = bakeHeight(framed, cols, rows, {
            gamma: state.gamma,
            invert: state.invert,
            smooth: state.smooth,
            crisp: state.crisp,
          });
          const amp = state.reliefMm * (state.boost ? 2.5 : 1);
          const positions = new Float32Array(cols * rows * 3);
          const indices: number[] = [];
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const i = y * cols + x;
              positions[i * 3] = (x / (cols - 1) - 0.5) * state.plateW;
              positions[i * 3 + 1] = state.baseMm + (baked[i] ?? 0) * amp + 0.05;
              positions[i * 3 + 2] = (y / (rows - 1) - 0.5) * state.plateD;
            }
          }
          for (let y = 0; y < rows - 1; y++) {
            for (let x = 0; x < cols - 1; x++) {
              const a = y * cols + x;
              const b = a + 1;
              const c = a + cols;
              const d = c + 1;
              indices.push(a, b, d, a, d, c);
            }
          }
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
          geo.setIndex(indices);
          geo.computeVertexNormals();
          if (surface) {
            surface.geometry.dispose();
            scene.remove(surface);
          }
          surface = new THREE.Mesh(geo, surfaceMat);
          scene.add(surface);
          span = Math.max(state.plateW, state.plateD, 20);
          plinth.scale.set(state.plateW * 0.998, Math.max(0.4, state.baseMm), state.plateD * 0.998);
          plinth.position.y = state.baseMm / 2;
          return;
        }

        const spec = specOf(state);
        if (state.make === "lattice") {
          plinthMat.color.set(0x100e0c);
        } else if (state.make === "sheet") {
          plinthMat.color.set(0x6b4228);
        } else {
          plinthMat.color.set(0x2a2418);
        }
        if (!raw) return;
        const built = buildPiece(raw, spec, "preview");
        if (built.triangles < 1) return;
        put(built.positions, 0.06, state.make === "relief" ? surfaceMat : cutMat);
        span = Math.max(built.spanW, built.spanD, 20);
        plinth.scale.set(built.spanW * 1.06, 0.7, built.spanD * 1.06);
        plinth.position.y = -0.35;
      };

      apply();
      let sig = "";
      let filamentSeen = "";
      const tint = () => {
        const filament = filamentById(useStudio.getState().filamentId);
        surfaceMat.color.set(filament.color);
        cutMat.color.set(filament.color);
        surfaceMat.roughness = filament.id === "black" ? 0.42 : 0.55;
        surfaceMat.metalness = filament.id === "black" ? 0.08 : 0.02;
      };
      const unsub = useStudio.subscribe((state) => {
        if (state.filamentId !== filamentSeen) {
          filamentSeen = state.filamentId;
          tint();
        }
        const next = [
          state.make,
          state.outline,
          state.gamma,
          state.invert,
          state.smooth,
          state.crisp,
          state.plateW,
          state.plateD,
          state.baseMm,
          state.reliefMm,
          state.boost,
          state.threshold,
          state.rimMm,
          state.wall,
          state.tileMm,
          state.gapMm,
          state.sheetCols,
          state.sheetRows,
          state.seam,
          state.edge,
          state.printRes,
          state.hanger,
        ].join("|");
        if (next !== sig) {
          sig = next;
          apply();
        }
      });

      let raf = 0;
      let timer = 0;
      const poll = () => {
        if (dead) return;
        if (!document.hidden) apply();
        timer = window.setTimeout(poll, 1000);
      };
      timer = window.setTimeout(poll, 700);

      const pointer = { x: 0, y: 0 };
      const onDown = (event: PointerEvent) => {
        dragging = true;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        canvas.setPointerCapture(event.pointerId);
      };
      const onMove = (event: PointerEvent) => {
        if (!dragging) return;
        azimuth -= (event.clientX - pointer.x) * 0.008;
        polar = Math.min(1.35, Math.max(0.28, polar + (event.clientY - pointer.y) * 0.006));
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      };
      const onUp = (event: PointerEvent) => {
        dragging = false;
        if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const spanNow = Math.max(useStudio.getState().plateW, useStudio.getState().plateD, span, 20);
        const current = userDist ?? spanNow * 1.65;
        userDist = Math.min(spanNow * 6, Math.max(spanNow * 0.55, current * (event.deltaY > 0 ? 1.08 : 0.92)));
      };
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      const loop = () => {
        if (dead) return;
        if (!dragging && !reduce) azimuth += 0.0035;
        placeCamera();
        gl.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      const release = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(timer);
        observer.disconnect();
        unsub();
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("wheel", onWheel);
        surface?.geometry.dispose();
        surfaceMat.dispose();
        cutMat.dispose();
        plinthMat.dispose();
        plinth.geometry.dispose();
        gl.dispose();
      };
      stop = release;
      if (dead) release();
    })();

    return () => {
      dead = true;
      stop();
    };
  }, [apiRef]);

  return (
    <div className="h-64 overflow-hidden rounded-lg border border-line bg-surface sm:h-72">
      <canvas ref={canvasRef} className="plate-canvas" aria-label="Piece preview. Drag to orbit." />
    </div>
  );
}

function specOf(state: ReturnType<typeof useStudio.getState>): PieceSpec {
  const scale = state.boost ? (state.make === "relief" ? 2.5 : 1.65) : 1;
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
    reliefScale: scale,
    hanger: state.hanger && state.make !== "relief",
  };
}
