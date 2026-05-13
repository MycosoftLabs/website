# Virtual Petri Dish Baseline - May 13, 2026

This checkpoint records the accepted visual baseline for the NatureOS Virtual Petri Dish before the next app upgrade pass.

## Accepted State

- The app uses a glass frame around the whole workspace, with separate glass treatments for the dish area, console, and controls.
- The petri dish surface is a soft agar/glass gradient in light mode, without the previous top-left lens flare stroke.
- Dark mode keeps the controls, labels, select text, and button text white over glass.
- The petri dish rim is drawn on its own top canvas layer so growth renders underneath the glass perimeter.
- Biological growth is clipped just inside the rim so mycelium does not visually grow over the dish edge.
- The simulation loop is decoupled from the visible hour counter so hour updates do not rebuild the interval and cause extra flicker.
- Pointer events are used for placement and controls so samples, contaminants, tools, and playback remain responsive while the simulation is running.

## Baseline Route

- Local: `http://127.0.0.1:3010/natureos/virtual-petri-dish`
- Screenshot reference: `screenshots/virtual-petri-dish-baseline-2026-05-13.png`
- The screenshot is a visual reference from the accepted interactive state; future upgrades should preserve the glass frame, rim, and control styling even when organism rendering changes.

## Next Upgrade Pass

Future work should keep this visual state as the fallback baseline while improving scientific realism, growth smoothness, organism rendering, and live interaction depth.
