# Mycosoft website icons

Product and device marks for mycosoft.com. Flat black / white / currentColor for nav and UI; clear glass plates for showcase heroes only.

## Product marks

MYCA, FUSARIUM, NatureOS, Nature Learning Model (nlm), FormSpace, Earth Simulator.

## Device marks

MycoBrain, Mushroom 1, SporeBase, Hyphae 1, MycoNode, ALARM, Psathyrella, Agaric.

Slug keys (match `ProductIcon` / routes): `mycobrain`, `mushroom-1`, `sporebase`, `hyphae-1`, `myconode`, `alarm`, `psathyrella`, `agaric`.

## Layout

- `black/*.svg` — light-mode flat marks
- `white/*.svg` — dark-mode flat marks
- `currentColor/*.svg` — mono sources for CSS color (inline / path extract)
- `black/png-*` and `white/png-*` — transparent PNGs at 24–1024px
- `glass/light/*.png` — clear glass (light surfaces)
- `glass/dark/*.png` — clear-on-black glass (dark surfaces)
- `glass/svg-light` / `glass/svg-dark` — vector glass clear variants
- `mycosoft-sprite.svg` — product symbols
- `mycosoft-devices.sprite.svg` — device symbols

Colored glass / color flat variants are **not** installed yet (Morgan: glass, no color icons yet).

## React

```tsx
import { ProductIcon, productMarkIcon } from "@/components/brand/product-icon"

// Nav / Lucide-sized (flat currentColor)
<ProductIcon product="mushroom-1" className="h-4 w-4" />
const Mark = productMarkIcon("sporebase")

// Showcase heroes only
<ProductIcon product="mycobrain" variant="glass" className="h-16 w-16" />
```

Light mode → black / currentColor dark; dark mode → white. Do not use `glass` in nav dropdowns.
