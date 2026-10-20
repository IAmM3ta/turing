# Grow a pattern, export an STL, and print it

This is the practical path from an empty bath to a part on the printer. The worked example is a round pierced grill, about 110 mm across. The same steps cover a hex plaque and a sheet of maze tiles. The differences are called out where the slicer settings change.

You need:

- TURiNG running in a browser (the hosted app, or `npm run dev` locally)
- A filament printer and a slicer: OrcaSlicer, PrusaSlicer, Bambu Studio, or Cura
- PLA, and a 0.4 mm nozzle if you leave **Walls** on **Printable**

The file is already in millimeters and Z up. Do not scale it to inches, and do not lay it on its edge.

## 1. Start a piece

Open the mill. The field on the left is the bath. The controls are on the right (below the field on a phone).

Tap a piece recipe. It sets chemistry, outline, and dimensions together. You can change any of them afterward.

| Recipe | What you get | A good first size |
| --- | --- | --- |
| Round grill | Disc with organic holes and a solid rim | 110 mm diameter, thickness about 3.2 mm, rim about 3.6 mm |
| Maze tiles | A grid of square labyrinths, separated by a gap | 46 mm tiles, 0.8 mm gap, 4 columns by 3 rows |
| Hex plaque | Six-sided plate with the pattern carved into the face | about 90 mm across, base 3.6 mm, relief about 1.1 mm |

Wait until the counter says the bath is **Growing** and the pattern has filled the field. A few thousand cycles is enough. You do not need to wait for it to stop. It does not stop on its own.

## 2. Make the pattern yours

The recipe is only a starting point.

**Change the chemistry.** Under **Bath**, try Worms for connected strands, Maze for corridors, Print for fingerprint ridges, or Holes for pits. Open **Chemistry** only if you want to move Feed and Kill by hand. Small moves matter. If the field dies to a flat color, tap **Reseed** or **Restore**.

**Fold it.** **Hex** makes a six-fold medallion. **Quad** mirrors both ways. **Open** is the raw field. Turn **Tile** on, with Fold set to Open, when a sheet should repeat without a seam.

**Paint.** Drag on the field while the button says **Seeding**. That plants chemical where you touch, and the pattern grows out of the stroke. Switch to **Erasing** to wipe a region back to empty. **Brush** sets the stroke: Fine, Medium, or Wide.

**Pace** is steps per frame. Faster fills the field sooner and is harder to catch at a particular moment. **Space** pauses so you can paint or export the frame you like. **R** reseeds from scratch. **Surprise** jumps to another chemistry. **Wipe** clears the bath.

Pause when the preview looks like the object, not when a number looks right.

## 3. Set the physical size

The plate preview is the object the STL will contain. Drag it to orbit.

Confirm the cut:

- **Lattice** for a grill or any part whose holes must go through.
- **Relief** for a carved plaque. **Recessed** cuts the pattern in. **Raised** leaves the pattern standing up.
- **Tiles** for a sheet. **Each its own** gives every square a different crop. **One picture** continues the pattern across the seams.

Then set millimeters:

- **Diameter**, **Across**, or **Width** and **Depth**. Stay inside your printer’s bed. A 110 mm disc fits most machines. A full 4×3 sheet of 46 mm tiles is larger; reduce columns, rows, or tile size if it does not.
- **Thickness** for lattice and tiles. Stay at or above 1.2 mm. About 2.4–3.2 mm prints as a rigid coaster or grill and still shows the holes.
- **Rim** is the solid border. About 3–4 mm on a round grill keeps the perimeter from tearing. Set it to **None** only if you want the pattern to reach the edge.
- **Holes** moves the threshold. **Chunky** means thicker material and smaller openings. **Open** and **Lace** mean more air. If a slicer later closes the holes, come back and move this toward Open, or move **Walls** toward Thick.
- **Walls** thickens the structure between holes. **Printable** is the default for a 0.4 mm nozzle. **Hairline** looks finer on screen and often fails on the printer because the walls are thinner than one extruded line.
- **Gap**, on a tile sheet, is the space between squares. 0.6–0.8 mm lets you snap them apart. **Touching** fuses them into one panel.
- **Base** and **Relief**, on a plaque. A base of 3–4 mm resists warping. A relief of about 0.8–1.6 mm reads as carving without becoming a tall fin.
- **Bite** and **Smooth** change contrast and blur before meshing. Raise Bite if the pattern looks washed out. One or two steps of Smooth takes the pixel crunch off a relief.
- **Print density.** Use **Fine** for a real print. **Draft** is for checking the shape. **Dense** is for a large, detailed plaque and makes a heavier STL.

Read the line under the buttons. It reports triangle count and file size. A lattice of well under a megabyte is normal. If the footer says loose islands were left out, the exporter dropped fragments that were not connected to the rim so the part stays one piece. If it says there is nothing solid to export, open fewer holes or add a rim and try again.

**Boosted view** makes the preview taller so shallow relief is visible. The file is not boosted. Switch to **True scale** if you want the preview to match the STL.

## 4. Download the STL

Pause the bath if you want this exact frame. Press **Download STL**.

The file name looks like `turing-worms-disc.stl`, `turing-maze-tiles.stl`, or `turing-print-hex.stl`.

It is a binary STL:

- units are millimeters
- Z is up
- the flat back sits on Z = 0
- the mesh is closed, so a slicer can treat it as a solid

**Download SVG** is the laser version of the same piece, not a substitute for the STL. Red paths are cuts. Black paths are engraves. Skip it for a filament print.

**Save pattern** writes a PNG of the bath. That is a picture, not a printable mesh.

## 5. Slice the round grill

This is the worked example. Repeat it for the other pieces, then apply the notes in the next section.

1. Open your slicer and start a new plate with a millimeter profile. In Cura, the machine definition must be millimeters. In PrusaSlicer, OrcaSlicer, and Bambu Studio, a normal printer profile already is.
2. Import `turing-worms-disc.stl` (or whatever the download was named).
3. Check the size. A part made at 110 mm must read as about 110 mm across. If it reads as about 4 mm, or about 2790 mm, the slicer guessed inches. Set the import unit to millimeters and import again. Do not scale by 2540% or 3.937% by eye.
4. Lay it on the bed, flat, holes facing up. It should already sit that way. Do not rotate it onto its edge. Do not center it vertically in the volume.
5. Choose PLA and a 0.4 mm nozzle. Nozzle temperature is your filament’s normal setting, often 200–215 °C for PLA, bed 55–60 °C.
6. Layer height 0.20 mm. Use 0.16 mm if you want cleaner rims around the holes. First layer 0.20 mm.
7. Perimeters: 3 or 4. The rim should be solid plastic, not infill with a skin.
8. Infill 15% gyroid is enough, because most of the disc is already open. Use 100% only for a small, heavy coaster.
9. Supports off. The part is a flat plate. Supports would grow up through the holes and ruin them.
10. Brim 5 mm if the disc is thin or your bed lets large flat parts lift. A textured PEI sheet often needs no brim at 3 mm thickness.
11. Slice and look at the preview layer by layer.
    - The first layer should be a continuous outline plus the starts of the walls.
    - Holes must stay open from the first layer to the last. A closed hole in the preview will be closed in the print.
    - No floating islands. Every wall should connect to the rim.
12. If the holes closed up, go back to TURiNG. Move **Holes** toward Open, or **Walls** to Thick, and export again. If the walls broke into specks, move **Holes** toward Chunky and add rim.
13. Export G-code, send it to the printer, and print.

A 110 mm grill at 0.20 mm layers and 3.2 mm thickness is a short print, usually well under two hours on a bed-slinger.

## 6. Notes for the other pieces

**Hex plaque.** Keep **Relief** and, for a carved look, **Recessed**. Print face up. Do not flip it to “protect” the detail. The detail is the top. Use a 0.12 or 0.16 mm layer height so a 1 mm relief is several layers, not one. A 3.6 mm base can be 15% infill with 4 top layers. If the grooves look muddy, lower Bite slightly or add one step of Smooth and export again. Elephant-foot compensation of about 0.1 mm keeps the first layer from swelling past the hex edge.

**Maze tiles.** One STL contains the whole sheet, with gaps already modeled. Slice it flat. After printing, flex the sheet or cut the bridges to separate the tiles. If neighboring tiles fused, the gap was smaller than your extrusion. Export again with Gap at 0.8 mm or 1.0 mm. If you wanted one solid panel, set Gap to **Touching** before exporting. Reduce columns and rows until the sheet fits the bed with a few millimeters of margin.

**Any lattice.** A 0.4 mm nozzle cannot hold a wall thinner than one line, and a reliable wall is two lines, about 0.8–1.0 mm. **Hairline** is for looking, not for printing, unless you have a smaller nozzle and you know the slicer is keeping those features.

## 7. Check the finished print

- Holes closed on the bottom only: the first layer was too squished. Lower first-layer flow a few percent, or reduce bed temperature slightly, and turn on elephant-foot compensation.
- Strings across holes: lower nozzle temperature by about 5 °C and dry the filament if it snaps or pops.
- The disc lifted at the rim: wash the bed, add a brim, or thicken the part and export again.
- The plaque’s carving is invisible: the relief was shorter than two layers. Raise **Relief** above 0.4 mm for a 0.20 mm layer height, or print at 0.12 mm.
- The slicer reports the mesh is not manifold or not a volume: export again from TURiNG. Do not run an aggressive “fix” that fills the holes. A grill is supposed to be hollow in the openings and solid in the walls.

## 8. Optional laser cut

**Download SVG** instead of, or in addition to, the STL.

- Red paths are through-cuts: the outline, and the holes of a lattice.
- Black paths are engraves: the grooves of a relief plaque.
- In the laser software, set red to cut and black to score or engrave. Power and speed depend on the machine and the material. On light wood, a low-power engrave matches the carved-plaque look. Run a small test square before the real piece.
- The SVG is in the same millimeter dimensions as the plate. Do not let the laser software fit-to-page unless you mean to rescale it.
