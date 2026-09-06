# Calico V7 — Static Printed-Edge Data

- `online-calico.html` no longer requires an external image-analysis step for token eligibility.
- The four supplied player-board layouts (`blue`, `green`, `purple`, `yellow`) contain embedded color/pattern data for the 22 printed-edge nodes used by the BoardMate graph (88 nodes total).
- Printed-edge data is used by the same component traversal as placed patch tiles.
- Board images remain visual-only. If a board image fails to load, automatic token eligibility still uses the embedded catalog.
- Pattern IDs: 1 stripes, 2 dots, 3 trellis, 4 floral, 5 leaf/fern, 6 vine/paisley.

## Validation

The embedded catalog is checked at runtime. Every board must contain every one of the 22 edge keys with a known color and one of the six pattern IDs. An incomplete catalog throws immediately instead of silently issuing incorrect tokens.

## Source basis

The 4-board screenshot supplied in the conversation was used as the visual source for the static transcription. MyAutoma's public Calico page confirms that partial/whole printed edge tiles may participate in both color button groups and pattern cat groups. It also describes the market/placement flow and the token rules.
