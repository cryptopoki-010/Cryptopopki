# CRYPTO GACHA

Mobile-first gacha storefront for crypto collectibles. Single static file (`index.html`), no build step, no backend. All values are sample data; no real funds.

## Deploy (Vercel)
1. Push `index.html`, `vercel.json`, `README.md` to a GitHub repository.
2. In Vercel: Add New -> Project -> Import the repository -> Framework "Other" -> Deploy.

## Changes in this version (v5, based on spec v4)
- Beta starting balance: 100 -> 1000 USDT
- Inventory: "Sell all" button (in-app confirm sheet)
- Mobile: double-tap / pinch zoom disabled
- Bazooka draw: aim reticle, muzzle smoke, crater and cracks, debris, grade pop-in, vignette
- Stone skipping: water glints, reflection, speed lines, UR shockwave ring
- Fishing: light rays, bubbles, bobber ripples, "!" bite alert, splash column
- Shared stage: vignette and cinematic bars

## Limits
No persistence (reload resets state). Math.random() is not provably fair.
