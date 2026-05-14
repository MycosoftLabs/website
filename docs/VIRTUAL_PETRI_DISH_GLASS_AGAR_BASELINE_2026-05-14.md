# Virtual Petri Dish Glass And Agar Baseline - 2026-05-14

This checkpoint records the accepted working direction before the next pass on filament and organism growth behavior.

## Visual System

- The Virtual Petri Dish app uses layered glass UI inside the NatureOS frame.
- The controls panel has a dotted grid base and glass controls floating above it.
- The glass button feature now has light and dark variants across:
  - oval Start/Pause button
  - circular Reset button
  - rectangular Swab, Scalpel, and Contam tool buttons
  - long Save Data and Record buttons
  - select/dropdown triggers for species, contaminant, agar type, and chemical overlay
- Floating control cards use a clear glass material with subtle gray corner weighting and edge bevels.
- Slider tracks use blue glass styling, and slider thumbs use white glass with a pressed state.

## Petri Dish Layer Stack

The dish visual stack is:

1. dotted stage grid
2. glass dish base and perimeter shadow
3. agar medium layer
4. simulation canvas for fungus, mold, mildew, bacteria, and virus growth
5. chemical overlay canvas
6. rim canvas

The dish is intended to read as an open Petri dish, not as a closed lid over the culture.

## Agar Layers

Agar is now represented as a separate layer below the simulation rather than painted into the simulation canvas.

Current agar media:

- Transparent Agar: nearly clear baseline medium
- Charcoal Agar: dark translucent black gelatin
- Blood Agar: red translucent gelatin
- Dextrose Pine Wood Agar: darker brown translucent medium
- Malt Extract Agar: light tan translucent medium
- Feces Agar: brown translucent medium
- Fungal Agar: pale green translucent medium
- Sabouraud Dextrose Agar: warm tan translucent medium

The artificial circular/ring texture was removed. Future realism work may replace the CSS material with a Three.js gelatin-like medium.

## Simulation Baseline

- Swab is meant to support drag placement like a Q-tip across the dish.
- Scalpel drops a clustered tissue chunk.
- Growth renders above the agar layer.
- The next planned experiment is to separate mycelium growth behavior from mold and mildew growth behavior, because those organisms should not share one filament model.

## MYCA Security Note

- MYCA chat and control paths must keep the logged-in gate. The sign-in requirement protects MYCA from anonymous or improper control injection through chat-driven workflows.
- UI copy may be moved or resized for clarity, but the authentication requirement should not be removed unless a replacement control-safety path is implemented.

## Verification

- `npm run lint -- --file components/apps/mycelium-simulator.tsx`
  - Passes with existing `react-hooks/exhaustive-deps` warnings for `isInsideGrowthArea`.
- Local route verified at `http://127.0.0.1:3010/natureos/virtual-petri-dish`.
