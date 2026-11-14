# NASA Trek Terrain: Manual Download Notes

Terrain data is **not used in the current build**. OUTPOST currently renders an animated 2D SVG scene, not a 3D terrain mesh, so it would be misleading to claim a Trek heightmap is displacing the scene.

The Trek user interfaces and layer listings were reachable on 2026-11-14, but this environment could not verify a stable one-shot export endpoint for a small grayscale heightmap. Use the Trek interface manually before adding terrain to a future 3D renderer.

## Mars: Jezero Crater

Verified imagery choice: **MRO HiRISE, Jezero Mosaic, Controlled**.

- Trek layer ID: `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`
- Listed coverage: 77.2229331–77.583964 E, 18.3067994–18.669315 N
- Source: [Mars Trek WMTS layer listing](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars)

Manual steps:

1. Open [Mars Trek](https://trek.nasa.gov/mars/) and use the Search tab to find the layer ID above.
2. Select **Add to Map**, then zoom into Jezero (about 77.4 E, 18.45 N).
3. Use **Subsetting** to draw a small square around the outpost area; choose the smallest practical image export.
4. Use **Downloads** or **Download Now** and save the original image and the Trek metadata.
5. Before committing an asset, crop and convert it to a grayscale PNG under 300 KB, then record the exact layer name, bounding box, source URL, and download date in metadata JSON.

## Moon: Shackleton rim / south pole

Verified imagery choice: **LRO LROC WAC Image Mosaic, S Pole**.

- Available from the Moon Trek South Pole Map basemap chooser.
- Source: [Moon Trek](https://trek.nasa.gov/moon/)

Manual steps:

1. Open [Moon Trek](https://trek.nasa.gov/moon/) and switch projection to **South Pole Map**.
2. In Basemap, select **LRO LROC WAC Image Mosaic, S Pole**; turn on Nomenclature to locate Shackleton.
3. Center near Shackleton (approximately 89.9 S, 129 E), then use **Subsetting** to draw a small rim-area export.
4. Download the smallest available image through **Downloads** and retain its metadata.
5. Crop and convert to a grayscale PNG under 300 KB only after preserving the original source details in metadata JSON.

## Future integration guardrail

Do not add a `Terrain: NASA Trek data` credit or list Trek as used until a downloaded asset is actually shipped and used by a 3D terrain renderer. A future implementation must gracefully fall back to procedural terrain when the local heightmap fails to load.
