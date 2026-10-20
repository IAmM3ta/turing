# TURiNG

Grow a Gray–Scott reaction-diffusion pattern, fold it, and cut it into something you can hold: a pierced grill, a sheet of maze tiles, a carved plaque, or a small piece of jewelry. Pick a filament color so the bath matches the plastic, then export a binary STL in millimeters, Z up, or a laser SVG.

The bath runs in the browser. A pattern leaves the machine only if you sign in and save the piece.

## Use it

The step-by-step for a custom pattern, an STL, and a 3D print is in [docs/printing.md](docs/printing.md).

Short version:

1. Open the mill and let the bath grow, or drag on the field to seed it.
2. Pick a piece under **Wear** or **Piece**, then change the filament, mirror, chemistry, and size until the preview is the object you want.
3. **Download STL**.
4. Import that file into a slicer in millimeters, leave it flat, and print it in PLA.

## Run it locally

Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

`npm run build` produces the production build. `npm run typecheck` checks types.

## What the controls do

| Control | What it changes |
| --- | --- |
| Filament | Color of the pattern on the bath and in the 3D preview. Default is white on a black bed. Black filament uses a gray bed so the lines stay visible. The STL itself has no color. |
| Mirror | **Off**, a left/right or top/bottom **Mirror**, a **Quad** fold, or a **Kaleidoscope** with 3–12 vertices. |
| Wear | Jewelry sizes: pendant, earrings, charm, brooch, cuff band, signet. Several include a hanger loop. |
| Saved | Sign in, name the current piece, and keep it on your account. Opening a saved piece restores the controls, not the grown frame. |
| Piece | One-tap setup. Round grill is a pierced disc. Maze tiles are separate squares. Hex plaque is a carved six-sided plate. |
| Cut | **Relief** raises or recesses the pattern. **Lattice** cuts holes through. **Tiles** repeats the pattern as a sheet. |
| Square / Round / Hex | Outline of a single plate. Tiles are always square. |
| Bath | Named Gray–Scott chemistries: Worms, Print, Maze, Holes, Soliton, and others. |
| From image | Cover-crops a photo into the bath. A light page is inverted so the marks read as ink. The current mirror is applied after. |
| Pace | Simulation steps per frame. |
| Brush | Size of the seed or erase stroke. Drag on the field. |
| Loop | Punches a bail at the top of a lattice or a tile so it can hang. Off for a relief. |
| Plate size | Millimeters. Diameter, across-flats, or width and depth. |
| Thickness, Rim, Holes, Walls | Lattice and tile structure. Walls at **Printable** is meant for a 0.4 mm nozzle. |
| Base, Relief, Raised / Recessed | Solid plaque. Recessed matches a carved surface. |
| Bite, Smooth, Crisp | Contrast, blur, then a hard edge. **Crisp** at **Print** is the default, so walls stay steep after Smooth. The same cut is used in the STL. |
| Print density | Draft, Fine, or Dense. Denser files are heavier and slower to slice. |
| Chemistry | Feed `F` and kill `k`. **Restore** returns to the preset. |

**Space** pauses and resumes. **R** reseeds. The 3D view orbits by drag. **Boosted view** exaggerates thickness so you can read the form; the STL stays true scale.

Downloads are named `turing-<preset>-<disc|hex|plate|tiles>.stl`. The SVG uses the same stem. Red paths are cuts. Black paths are engraves.

## How a file is made

The field is a Gray–Scott simulation on a WebGL2 ping-pong buffer, with an optional kaleidoscope fold. A height or mask is baked from the B channel, sharpened by the Crisp curve, clipped to the outline, and extruded into a closed triangle mesh. The STL is binary, millimeters, Z up, with the flat face on Z = 0. A lattice can include a hanger hole.

## Rights

Copyright Robert “Metta” Thomas. All rights reserved.

Do not use this repository, its text, its interface, or assets generated from it to train machine-learning models.
