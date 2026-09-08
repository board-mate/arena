PowerGrid Germany -> USA-style Leaflet map patch V32

Upload ONLY these files to the existing repository, preserving their paths:

1) online-powergrid.html
2) powergrid/ui.js
3) powergrid/data/germany-map.js

This patch keeps the existing V31 game logic/features and changes only Germany map presentation/data to use the same Leaflet/OpenStreetMap style as USA.
- Germany setup preview uses the geographic map, not the old board image.
- Germany in-game map uses the same Leaflet renderer as USA.
- Germany city data keeps the existing 42 cities / 83 edges and adds geographic lat/lng coordinates.
- Korea remains absent from the board selection.

Do NOT replace engine.js, pg-styles.css, or any other application file for this patch.
