# TURiNG

Grow a Gray–Scott reaction-diffusion pattern, fold it, and cut it into something you can hold: a pierced round grill, a sheet of maze tiles, or a carved hexagonal plaque. Export a binary STL in millimeters, Z up, or a laser SVG.

The bath runs in the browser. Nothing about the pattern is sent to a server.

## Use it

The step-by-step for a custom pattern, an STL, and a 3D print is in [docs/printing.md](docs/printing.md).

Short version:

1. Open the mill and let the bath grow, or drag on the field to seed it.
2. Pick **Round grill**, **Maze tiles**, or **Hex plaque**, then change the chemistry, fold, and size until the preview is the object you want.
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
| Piece | One-tap setup. Round grill is a pierced disc. Maze tiles are separate squares. Hex plaque is a carved six-sided plate. |
| Cut | **Relief** raises or recesses the pattern. **Lattice** cuts holes through. **Tiles** repeats the pattern as a sheet. |
| Square / Round / Hex | Outline of a single plate. Tiles are always square. |
| Bath | Named Gray–Scott chemistries: Worms, Print, Maze, Holes, Soliton, and others. |
| Fold | Open, bilateral mirrors, or 3-, 6-, and 8-fold kaleidoscopes. |
| Pace | Simulation steps per frame. |
| Brush | Size of the seed or erase stroke. Drag on the field. |
| Plate size | Millimeters. Diameter, across-flats, or width and depth. |
| Thickness, Rim, Holes, Walls | Lattice and tile structure. Walls at **Printable** is meant for a 0.4 mm nozzle. |
| Base, Relief, Raised / Recessed | Solid plaque. Recessed matches a carved surface. |
| Bite, Smooth | Contrast and blur of the height before it becomes mesh. |
| Print density | Draft, Fine, or Dense. Denser files are heavier and slower to slice. |
| Chemistry | Feed `F` and kill `k`. **Restore** returns to the preset. |

**Space** pauses and resumes. **R** reseeds. The 3D view orbits by drag. **Boosted view** exaggerates thickness so you can read the form; the STL stays true scale.

Downloads are named `turing-<preset>-<disc|hex|plate|tiles>.stl`. The SVG uses the same stem. Red paths are cuts. Black paths are engraves.

## How a file is made

The field is a Gray–Scott simulation on a WebGL2 ping-pong buffer, with an optional kaleidoscope fold. A height or mask is baked from the B channel, clipped to the outline, and extruded into a closed triangle mesh. The STL is binary, millimeters, Z up, with the flat face on Z = 0.

## Rights

Copyright Robert “Metta” Thomas. All rights reserved.

Do not use this repository, its text, its interface, or assets generated from it to train machine-learning models.
